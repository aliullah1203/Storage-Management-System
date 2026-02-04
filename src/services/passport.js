const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        if (!email)
          return done(null, false, { message: "No email from Google" });

        // Check if user already exists
        let user = await User.findOne({ email });

        if (!user) {
          // Auto-register new Google user
          user = await User.create({
            name,
            email,
            provider: "google",
            isVerified: true,
          });
        }

        return done(null, user);
      } catch (err) {
        console.error("Google OAuth error:", err);
        return done(err, null);
      }
    },
  ),
);

module.exports = passport;
