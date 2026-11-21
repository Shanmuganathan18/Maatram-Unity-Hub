/**
 * src/modules/settings/settings.service.js
 */
const prisma = require('../../config/database');

const getSettings = async () => {
  const rows = await prisma.systemSetting.findMany();
  const settings = {
    general: {},
    academic: {},
    availability: {},
    events: {},
    notifications: {},
    security: {},
  };

  rows.forEach((r) => {
    const parts = r.key.split('.');
    const group = parts[0];
    const key = parts[1];

    if (settings[group]) {
      let parsed = r.value;
      if (parsed === 'true') parsed = true;
      else if (parsed === 'false') parsed = false;
      else if (/^\d+$/.test(parsed)) parsed = parseInt(parsed, 10);

      settings[group][key] = parsed;
    }
  });

  return settings;
};

const updateSettings = async (updates, actor) => {
  for (const [group, values] of Object.entries(updates)) {
    if (typeof values === 'object' && values !== null) {
      for (const [subKey, val] of Object.entries(values)) {
        const fullKey = `${group}.${subKey}`;
        await prisma.systemSetting.upsert({
          where: { key: fullKey },
          update: {
            value: String(val),
            updatedById: actor.id,
          },
          create: {
            key: fullKey,
            value: String(val),
            updatedById: actor.id,
          },
        });
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'settings.updated',
      category: 'Settings',
      description: 'Updated system settings',
    },
  });

  return getSettings();
};

module.exports = {
  getSettings,
  updateSettings,
};

