const config = {
  // توكن البوت من Discord Developer Portal
  discordToken: "",
  // معلومات OAuth2 من قسم OAuth2 في Discord Developer Portal
  clientId: "",
  clientSecret: "",
  // رابط الاستضافة الخاص بك (مثال: https://your-bot.render.com)
  // لا تضع / في نهاية الرابط
  appUrl: "",
  // رابط إعادة التوجيه لتسجيل الدخول
  discordRedirectUrl: "",
  // مفتاح Gemini API إذا كنت تريد استخدام ميزات الذكاء الاصطناعي
  geminiApiKey: "",
  // سر عشوائي لتأمين الجلسات (يمكنك تركه كما هو أو تغييره)
  jwtSecret: "requiem-super-secret-key-2026"
};
export {
  config
};
