import { feature, plan, item } from "atmn";

export const nftExports = feature({
  id: "nft_exports",
  name: "NFT exportés",
  type: "metered",
  consumable: true,
});

export const aiTraits = feature({
  id: "ai_traits",
  name: "Traits IA",
  type: "metered",
  consumable: true,
});

export const free = plan({
  id: "free",
  name: "Free",
  autoEnable: true,
  items: [
    item({ featureId: nftExports.id, included: 100, reset: { interval: "month" } }),
    item({ featureId: aiTraits.id, included: 10, reset: { interval: "month" } }),
  ],
});

export const creator = plan({
  id: "creator",
  name: "Creator",
  price: { amount: 19, interval: "month" },
  items: [
    item({ featureId: nftExports.id, included: 10000, reset: { interval: "month" } }),
    item({ featureId: aiTraits.id, included: 200, reset: { interval: "month" } }),
  ],
});

export const studio = plan({
  id: "studio",
  name: "Studio",
  price: { amount: 49, interval: "month" },
  items: [
    item({ featureId: nftExports.id, included: 50000, reset: { interval: "month" } }),
    item({ featureId: aiTraits.id, included: 1000, reset: { interval: "month" } }),
  ],
});

export default {
  features: [nftExports, aiTraits],
  plans: [free, creator, studio],
};
