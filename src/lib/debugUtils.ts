
// Production version - debug utilities
export const isAdminAccessForce = false;

export const debugAdminStatus = async () => {
  return { success: false, message: "Debug disabled in production" };
};

export const fixAdminStatus = async () => {
  return { success: false, message: "Fix disabled in production" };
};

export default {
  isAdminAccessForce,
  debugAdminStatus,
  fixAdminStatus
};
