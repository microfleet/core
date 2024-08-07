import { NotPermittedError } from 'common-errors'

import type { Microfleet } from '@microfleet/core-types'
import { Lifecycle, type LifecycleExtension, type ServiceRequest } from '@microfleet/plugin-router'

export const rbacExtension: LifecycleExtension = {
  point: Lifecycle.hooks.preAllowed,
  async handler(this: Microfleet, request: ServiceRequest): Promise<void> {
    const { action, auth } = request

    if (action.rbac && auth?.scopes) {
      const { subject, action: subjectAction } = action.rbac
      const ability = this.rbac.createAbility(auth?.scopes)

      if (!this.rbac.can(ability, subjectAction, subject)) {
        throw new NotPermittedError(`cannot execute action '${subjectAction}' on '${subject}'`)
      }
    }
  },
}
