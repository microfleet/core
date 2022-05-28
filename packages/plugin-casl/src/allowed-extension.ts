import { NotPermittedError } from 'common-errors'

import { Microfleet } from '@microfleet/core-types'
import { Lifecycle, LifecycleExtension, ServiceRequest } from '@microfleet/plugin-router'

export const canExtension: LifecycleExtension = {
  point: Lifecycle.hooks.preAllowed,
  async handler(this: Microfleet, request: ServiceRequest): Promise<void> {
    const { action, auth } = request

    if (action.rbacScope && auth?.scopes) {
      const { subject, action: subjectAction } = action.rbacScope
      const ability = this.rbac.getAbility(auth?.scopes)

      if (!this.rbac.isActionPossible(ability, subjectAction, subject)) {
        throw new NotPermittedError(`cannot execute action '${subjectAction}' on '${subject}'`)
      }
    }
  },
}
