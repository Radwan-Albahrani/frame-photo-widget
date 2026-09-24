const { getDefaultConfig } = require("expo/metro-config");
const { withRozenite } = require("@rozenite/metro");

module.exports = withRozenite(getDefaultConfig(__dirname), {
  enabled: process.env.WITH_ROZENITE === "true",
});
