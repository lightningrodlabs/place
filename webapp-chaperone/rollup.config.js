import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import builtins from "rollup-plugin-node-builtins";
//import globals from "rollup-plugin-node-globals";

import babel from "@rollup/plugin-babel";
import html from "@web/rollup-plugin-html";
import { importMetaAssets } from "@web/rollup-plugin-import-meta-assets";
import { terser } from "rollup-plugin-terser";


const HC_PORT = process.env.HC_PORT || 8888;
const PLACE_CHAPERONE_SERVER_URL = process.env.PLACE_CHAPERONE_SERVER_URL || 'http://localhost:24274';
const DIST_FOLDER = "dist"

console.log("######## process.env.PLACE_CHAPERONE_SERVER_URL: " + process.env.PLACE_CHAPERONE_SERVER_URL + "\n\n")

export default {
  input: "index.html",
  output: {
    entryFileNames: "[hash].js",
    chunkFileNames: "[hash].js",
    assetFileNames: "[hash][extname]",
    format: "es",
    dir: "dist",
  },
  preserveEntrySignatures: false,
  watch: {
    clearScreen: false,
  },

  plugins: [
    /** Enable using HTML as rollup entrypoint */
    html({
      minify: true,
      //injectServiceWorker: true,
      //serviceWorkerPath: "dist/sw.js",
    }),
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    replace({
      "process.env.NODE_ENV": '"production"',
      "process.env.ENV": `"${process.env.ENV}"`,
      "process.env.HC_PORT": `"${HC_PORT}"`,
      "process.env.PLACE_CHAPERONE_SERVER_URL": `"${PLACE_CHAPERONE_SERVER_URL}"`,
      preventAssignment: true
    }),
    builtins(),
    typescript({ experimentalDecorators: true, outDir: DIST_FOLDER }),
    commonjs({}),
    //globals(), // removed because it cause build error
    /** Minify JS */
    terser(),
    /** Bundle assets references via import.meta.url */
    importMetaAssets(),
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
  ],
};
