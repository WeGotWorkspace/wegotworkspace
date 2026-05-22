/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (message) => message.startsWith("Merge "),
    (message) => message.startsWith("Revert "),
    (message) => /^chore\(release\):/i.test(message),
  ],
  rules: {
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
  },
};
