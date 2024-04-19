export const DOC_FOLDER = 'docs';

enum Packages {
  ReactNativeSdk = 'react-native-sdk',
  ReactSdk = 'react-sdk',
  VueSdk = 'vue-sdk',
  CommonSdk = 'common-sdk',
  AttachmentsSdk = 'attachments-sdk',
  WebSdk = 'web-sdk'
}

interface Package {
  name: string;
  dirName: Packages;
  entryPoints: string[];
  tsconfig: string;
  id: Packages;
}

type PackageMap = {
  [key in Packages]: Package;
};

export const packageMap: PackageMap = {
  [Packages.ReactNativeSdk]: {
    name: 'React Native SDK',
    dirName: Packages.ReactNativeSdk,
    entryPoints: ['../packages/react-native/src/'],
    tsconfig: '../packages/react-native/tsconfig.json',
    id: Packages.ReactNativeSdk
  },
  [Packages.ReactSdk]: {
    name: 'React SDK',
    dirName: Packages.ReactSdk,
    entryPoints: ['../packages/react/src/index.ts'],
    tsconfig: '../packages/react/tsconfig.json',
    id: Packages.ReactSdk
  },
  [Packages.VueSdk]: {
    name: 'Vue SDK',
    dirName: Packages.VueSdk,
    entryPoints: ['../packages/vue/src/index.ts'],
    tsconfig: '../packages/vue/tsconfig.json',
    id: Packages.VueSdk
  },
  [Packages.CommonSdk]: {
    name: 'Common SDK',
    dirName: Packages.CommonSdk,
    entryPoints: ['../packages/common/src/index.ts'],
    tsconfig: '../packages/common/tsconfig.json',
    id: Packages.CommonSdk
  },
  [Packages.AttachmentsSdk]: {
    name: 'Attachments SDK',
    dirName: Packages.AttachmentsSdk,
    entryPoints: ['../packages/attachments/src/index.ts'],
    tsconfig: '../packages/attachments/tsconfig.json',
    id: Packages.AttachmentsSdk
  },
  [Packages.WebSdk]: {
    name: 'Web SDK',
    dirName: Packages.WebSdk,
    entryPoints: ['../packages/web/src/index.ts'],
    tsconfig: '../packages/web/tsconfig.json',
    id: Packages.WebSdk
  }
};
