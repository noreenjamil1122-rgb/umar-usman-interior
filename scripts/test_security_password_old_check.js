const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing Security Password Old Password Verification ---');

// 1. Backend API checks in app/api/settings/route.ts
const settingsRoutePath = path.join(__dirname, '../app/api/settings/route.ts');
const routeContent = fs.readFileSync(settingsRoutePath, 'utf8');

assert(routeContent.includes('comparePassword'), 'Settings route imports and uses comparePassword');
assert(routeContent.includes('const { type, newPassword, action, oldPassword } = body'), 'Settings route extracts oldPassword from request body');
assert(routeContent.includes('if (existingHash)'), 'Settings route checks if an existingHash is already active');
assert(routeContent.includes('if (!oldPassword)'), 'Settings route rejects update/removal if oldPassword is missing');
assert(routeContent.includes('await comparePassword(oldPassword, existingHash)'), 'Settings route validates oldPassword against existingHash');

// 2. Frontend UI checks in app/settings/page.tsx
const settingsPagePath = path.join(__dirname, '../app/settings/page.tsx');
const pageContent = fs.readFileSync(settingsPagePath, 'utf8');

assert(pageContent.includes('oldSecurityPassword'), 'Settings page tracks oldSecurityPassword state');
assert(pageContent.includes('isSelectedPwdTypeActive'), 'Settings page computes isSelectedPwdTypeActive');
assert(pageContent.includes('Old / Current Password'), 'Settings page renders Old / Current Password label when active');
assert(pageContent.includes('showOldSecurityPwdText'), 'Settings page provides show/hide eye toggle for old password');
assert(pageContent.includes('showNewSecurityPwdText'), 'Settings page provides show/hide eye toggle for new password');
assert(pageContent.includes('oldPassword: oldSecurityPassword'), 'Settings page sends oldPassword in handleUpdatePassword');
assert(pageContent.includes('removingPwdType'), 'Settings page tracks removingPwdType for secure removal confirmation');
assert(pageContent.includes('handleConfirmRemovePassword'), 'Settings page implements handleConfirmRemovePassword');

console.log('\n🎉 ALL SECURITY PASSWORD OLD-PASSWORD CHECK ASSERTIONS PASSED!');
