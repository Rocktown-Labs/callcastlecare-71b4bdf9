import { createApiClient } from "@callcastlecare/api";
import type { ApiType } from "server";

import { getServerUrl } from "./server-url";

export const apiClient = createApiClient<ApiType>(getServerUrl());
