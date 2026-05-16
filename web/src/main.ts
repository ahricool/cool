import { createApp } from "vue";
import App from "./App";
import { router } from "./router";
import "./css/main.css";
import "./styles/sakura-vue.css";

createApp(App).use(router).mount("#app");
