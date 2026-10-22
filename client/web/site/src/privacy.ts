import "./tokens.css";
import "./base.css";
import "./sections.css";
import "./privacy.css";

import { autoHideNav } from "./nav";

autoHideNav(document.querySelector<HTMLElement>(".nav")!);
