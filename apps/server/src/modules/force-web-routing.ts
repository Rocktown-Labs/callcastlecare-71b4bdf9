export default {
  name: "callcastlecare/force-web-routing",
  setup(nitro: { routing?: boolean }) {
    nitro.routing = true;
  },
};
