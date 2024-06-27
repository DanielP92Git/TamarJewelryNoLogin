module.exports = {
  plugins: [
    {
      name: "removeDoctype",
      active: true,
    },
    {
      name: "removeComments",
      active: true,
    },
    {
      name: "cleanupNumericValues",
      params: {
        floatPrecision: 2,
      },
    },
    {
      name: "convertColors",
      params: {
        names2hex: true,
        rgb2hex: true,
      },
    },
  ],
};
