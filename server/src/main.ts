import { app } from "./app";
import { config } from "./shared/config";

app.listen(config.PORT, () => console.log(`DEEMO server on :${config.PORT}`));
