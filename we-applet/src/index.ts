import {AdminWebsocket, AppWebsocket} from "@holochain/client";
import {WeApplet, AppletRenderers, WeServices, AppletInfo} from "@lightningrodlabs/we-applet";
import {PlaceApp} from "place";

const placeApplet: WeApplet = {
  async appletRenderers(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weServices: WeServices,
    appletAppInfo: AppletInfo[],
  ): Promise<AppletRenderers> {
    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        console.log("placeApplet.full()", appWebsocket.client.socket.url)
        if ((appletAppInfo as any).length > 1) {
          console.error("Wrong type of appletAppInfo passed. Expected only a single 'AppletInfo' but got multiple.")
        } else {
          registry.define("place-app", PlaceApp);

          const app = new PlaceApp(appWebsocket, adminWebsocket, "place-applet");
          element.appendChild(app);
        }
      },
      blocks: [],
    };
  },
};


export default placeApplet;
