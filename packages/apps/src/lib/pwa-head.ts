type PwaHeadConfig = {
  title: string;
  description: string;
  themeColor: string;
  appTitle: string;
  manifest: string;
  /** 180×180 PNG — required for iOS Add to Home Screen. */
  appleTouchIcon: string;
  /** Vector favicon for modern browsers. */
  iconSvg: string;
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
      { rel: "apple-touch-icon", href: config.appleTouchIcon },
      { rel: "icon", type: "image/svg+xml", href: config.iconSvg },
    ],
  };
}
