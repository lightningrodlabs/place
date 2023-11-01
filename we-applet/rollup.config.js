import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import copy from "rollup-plugin-copy";
import babel from "@rollup/plugin-babel";

// import replace from "@rollup/plugin-replace";
import builtins from "rollup-plugin-node-builtins";
import html from "@web/rollup-plugin-html";


//import { importMetaAssets } from "@web/rollup-plugin-import-meta-assets";
//import { terser } from "rollup-plugin-terser";


const DIST_FOLDER = "dist"

export default {
  input: "index.html",
  output: {
    entryFileNames: "index.js",
    //chunkFileNames: "[hash].js",
    assetFileNames: "assets[extname]",
    format: "es",
    dir: DIST_FOLDER,
  },
  watch: {
    clearScreen: false,
  },
  external: [],

  plugins: [
    copy({
      targets: [
        { src: "../webapp/logo.svg", dest: DIST_FOLDER },
        { src: "../webapp/logo.svg", dest: DIST_FOLDER + "/assets" },
        { src: "../node_modules/@shoelace-style/shoelace/dist/themes/light.css", dest: DIST_FOLDER, rename: "styles.css" },
        { src: '../node_modules/@shoelace-style/shoelace/dist/assets', dest: DIST_FOLDER }
      ],
    }),
    /** Enable using HTML as rollup entrypoint */
    html({
      //minify: true,
      //injectServiceWorker: true,
      //serviceWorkerPath: "dist/sw.js",
    }),
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    builtins(),
    /** Compile JS to a lower language target */
    babel({
      exclude: /node_modules/,

      babelHelpers: "bundled",
      presets: [
        [
          require.resolve("@babel/preset-env"),
          {
            targets: [
              "last 3 Chrome major versions",
              "last 3 Firefox major versions",
              "last 3 Edge major versions",
              "last 3 Safari major versions",
            ],
            modules: false,
            bugfixes: true,
          },
        ],
      ],
      plugins: [
        [
          require.resolve("babel-plugin-template-html-minifier"),
          {
            modules: {
              lit: ["html", { name: "css", encapsulation: "style" }],
            },
            failOnError: false,
            strictCSS: true,
            htmlMinifier: {
              collapseWhitespace: true,
              conservativeCollapse: true,
              removeComments: true,
              caseSensitive: true,
              minifyCSS: true,
            },
          },
        ],
      ],
    }),
    commonjs({}),
  ],
};
