module.exports = function tailwindPostcssShim() {
  return {
    postcssPlugin: "tailwindcss-postcss-shim",
    Once() {},
  };
};

module.exports.postcss = true;
