const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing Account Password Admin Protection & Current Password Reveal ---');

// 1. Check User model schema and interface
const userModelPath = path.join(__dirname, '../models/User.ts');
const userModelContent = fs.readFileSync(userModelPath, 'utf8');

assert(userModelContent.includes('displayPassword?: string;'), 'IUser interface defines displayPassword');
assert(userModelContent.includes('displayPassword: {'), 'UserSchema defines displayPassword');

// 2. Check reveal password endpoint
const revealRoutePath = path.join(__dirname, '../app/api/auth/reveal-account-password/route.ts');
assert(fs.existsSync(revealRoutePath), 'reveal-account-password route exists');
const revealRouteContent = fs.readFileSync(revealRoutePath, 'utf8');

assert(revealRouteContent.includes('deletePasswordHash'), 'Route checks Admin Delete Protection password');
assert(revealRouteContent.includes('comparePassword'), 'Route uses comparePassword for verification');
assert(revealRouteContent.includes('currentPassword: revealedPassword'), 'Route returns revealed current password');

// 3. Check change password endpoint
const changeRoutePath = path.join(__dirname, '../app/api/auth/change-password/route.ts');
const changeRouteContent = fs.readFileSync(changeRoutePath, 'utf8');

assert(changeRouteContent.includes('adminAuthorized'), 'change-password route checks adminAuthorized');
assert(changeRouteContent.includes('adminPassword'), 'change-password route checks adminPassword');
assert(changeRouteContent.includes('user.displayPassword = newPassword'), 'change-password route persists displayPassword');

// 4. Check PasswordPromptModal callback update
const modalPath = path.join(__dirname, '../components/ui/PasswordPromptModal.tsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

assert(modalContent.includes('onSuccess?: (password?: string) => void;'), 'PasswordPromptModal supports passing verified password');
assert(modalContent.includes('onSuccess(verifiedPassword)'), 'PasswordPromptModal passes verifiedPassword to onSuccess');

// 5. Check Settings Account Tab UI
const settingsPagePath = path.join(__dirname, '../app/settings/page.tsx');
const settingsContent = fs.readFileSync(settingsPagePath, 'utf8');

assert(settingsContent.includes('isAccountUnlocked'), 'Settings page tracks isAccountUnlocked');
assert(settingsContent.includes('isUnlockModalOpen'), 'Settings page tracks isUnlockModalOpen');
assert(settingsContent.includes('Verify Admin Password to Unlock'), 'Settings page displays locked state with unlock button');
assert(settingsContent.includes('handleAdminUnlockSuccess'), 'Settings page implements handleAdminUnlockSuccess');
assert(settingsContent.includes('reveal-account-password'), 'Settings page calls reveal-account-password endpoint');
assert(settingsContent.includes('showCurrentPwdText'), 'Settings page provides show/hide toggle for current password');
assert(settingsContent.includes('Show Current Password'), 'Settings page renders Show Current Password button');
assert(settingsContent.includes('PasswordPromptModal'), 'Settings page integrates PasswordPromptModal for account credentials');

console.log('\n🎉 ALL ACCOUNT PASSWORD ADMIN PROTECTION ASSERTIONS PASSED!');
