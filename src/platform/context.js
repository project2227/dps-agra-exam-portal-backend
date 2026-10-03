'use strict';
const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
const DPS_ID = '00000000-0000-4000-8000-000000000001';
const currentTenant = () => context.getStore();
const withTenant = (tenant, fn) => context.run(tenant, fn);
const enabled = () => process.env.PLINTH_ENABLED === 'true';
module.exports = { context, currentTenant, withTenant, DPS_ID, enabled };
