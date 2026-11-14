import type { PropertyStore } from "../../snapshot/domain/store";

/** Script Properties as a `PropertyStore`. Task 2 adds full settings decoding on top. */
export const scriptProperties: PropertyStore = {
  get(name) {
    return PropertiesService.getScriptProperties().getProperty(name);
  },
  set(name, value) {
    PropertiesService.getScriptProperties().setProperty(name, value);
  },
};
