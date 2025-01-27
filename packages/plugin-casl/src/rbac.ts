import assert from 'node:assert/strict'
// @ts-expect-error: possible to import sync ESM from node >= 22.12.0
import mem from 'memoize'

import type { ExtractSubjectType, MongoQuery, Subject, SubjectRawRule } from '@casl/ability'
import { subject, createAliasResolver, PureAbility } from '@casl/ability'
import { defaultsDeep } from '@microfleet/utils'

export type RuleDefinition = SubjectRawRule<string, ExtractSubjectType<Subject>, MongoQuery<unknown>>[] | undefined

export type ActionRbac = {
  subject: string,
  action: string,
}

export type RbacConfig = {
  /** Specify whether `createAbility` should memoize result or not. Default: enabled */
  cache?: {
    enabled: boolean;
    maxAge: number;
  },

  /** Global project abilities. See https://casl.js.org/v5/en/guide/define-rules#json-objects */
  abilities: {
    [key: string]: RuleDefinition;
  },

  /** Action alias definition. See https://casl.js.org/v5/en/guide/define-aliases */
  actions?: {
    [key: string]: string[],
  }

  /** Override `manage` aka `*` action name. */
  anyAction?: string

  /** Override `all` aka `*` any subject */
  anySubjectType?: string

  /** Custom subject type resolver. See https://casl.js.org/v5/en/guide/subject-type-detection */
  detectSubjectType?: ((subject: Record<string, any>) => ExtractSubjectType<Subject>)
}

export class Rbac {
  private abilities: Map<string, PureAbility>  = new Map()
  private anyAction?: string
  private anySubjectType: string | undefined
  private actionResolver?: (action: string | string[]) => string[]
  private detectSubjectType?: ((subject: Record<string, any>) => ExtractSubjectType<Subject>) | undefined
  static maxAge: number | undefined

  constructor(config: RbacConfig) {
    const finalConfig = defaultsDeep<RbacConfig>(config, {
      cache: {
        enabled: true,
        maxAge: 1000,
      }
    })

    const { anyAction, actions, detectSubjectType, abilities, anySubjectType } = finalConfig

    this.anyAction = anyAction
    this.anySubjectType = anySubjectType
    this.detectSubjectType = detectSubjectType

    if (actions) {
      this.actionResolver = createAliasResolver(actions, { anyAction: this.anyAction })
    }

    if (abilities) {
      Object.entries(abilities).forEach(([key, rule]) => {
        this.abilities.set(key, this.createAbility(rule))
      })
    }

    if (config.cache?.enabled) {
      this.createAbility = mem(this.createAbility, { maxAge: config.cache.maxAge })
    }
  }

  /**
   * Verifies whether action is available on provided subject.
   */
  public can(ability: PureAbility, action: string, targetSubject: Subject, _overrideSubject?: string) {
    const passedSubject = typeof targetSubject === 'string'
      ? targetSubject
      : ability.detectSubjectType(targetSubject) as string
    const actionSubject = _overrideSubject || passedSubject

    const parts = actionSubject.split(':')
    const [scopeSubject] = parts

    const relevantRule = ability.relevantRuleFor(action, actionSubject)

    if (relevantRule?.subject === actionSubject) {
      return ability.can(action, actionSubject)
    }

    return ability.can(action, scopeSubject)
  }

  /**
   * Verifies whether action is available on provided object.
   * Wraps object with secified Subject to mach rules.
   */
  public canSubject(ability: PureAbility, action: string, sub: string, obj: Record<string, any>) {
    return this.can(ability, action, subject(sub, obj), sub)
  }

  /**
   * Get predefined ability
   */
  public get(key: string): PureAbility {
    if (this.abilities.has(key)) {
      return this.abilities.get(key)!
    }

    assert.fail(`'${key}' ability does not exists in configuration`)
  }

  /**
   * Creates ability based on passed rules
   */
  public createAbility(rules: RuleDefinition): PureAbility {
    return new PureAbility(rules, {
      anyAction: this.anyAction,
      anySubjectType: this.anySubjectType,
      resolveAction: this.actionResolver,
      detectSubjectType: this.detectSubjectType
    })
  }
}
