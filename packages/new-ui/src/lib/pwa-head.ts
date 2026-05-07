type PwaHeadConfig = {
  title: string;
  description: string;
  themeColor: string;
  appTitle: string;
  manifest: string;
  icon180: string;
  icon192: string;
};

export function createPwaHead(config: PwaHeadConfig) {
  return {
    meta: [
      { title: config.title },
      { name: "description", content: config.description },
      { name: "theme-color", content: config.themeColor },
      { name: "apple-mobile-web-app-title", content: config.appTitle },
    ],
    links: [
      { rel: "manifest", href: config.manifest },
      { rel: "apple-touch-icon", href: config.icon180 },
      { rel: "icon", type: "image/png", href: config.icon192 },
    ],
  };
}
