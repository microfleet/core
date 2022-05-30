import { Ability, ExtractSubjectType, MongoQuery, Subject, subject, SubjectRawRule, detectSubjectType} from '@casl/ability'

export type RuleDefinition = SubjectRawRule<string, ExtractSubjectType<Subject>, MongoQuery<unknown>>[] | undefined

export class Rbac {
  /**
   * Verifies whether action is available on provided bubject.
   */
  public isActionPossible(ability: Ability, action: string, targetSubject: Subject, _overrideSubject?: string) {
    const passedSubject = typeof targetSubject === 'string' ? targetSubject : detectSubjectType(targetSubject)
    const actionSubject = _overrideSubject || passedSubject

    const parts = actionSubject.split(':')
    const [scopeSubject] = parts

    if (ability.possibleRulesFor(action, actionSubject).length > 0) {
      return ability.can(action, actionSubject)
    }

    return parts.length > 1 && ability.can(action, scopeSubject)
  }

  /**
   * Verifies whether action is available on provided object.
   * Wraps object with secified Subject to mach rules.
   */
  public isObjectActionPossible(ability: Ability, action: string, sub: string, obj: Record<string, any>) {
    return this.isActionPossible(ability, action, subject(sub, obj), sub)
  }

  /**
   * Creates ability based on passed rules
   */
  public getAbility(rules: RuleDefinition): Ability {
    return new Ability(rules)
  }
}
