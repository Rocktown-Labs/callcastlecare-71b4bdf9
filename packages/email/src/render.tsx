/* @jsxImportSource react */
import { render } from "@react-email/render";
import type { ReactElement } from "react";

import { ActionEmail } from "./templates/action-email";
import type { ActionEmailProps } from "./templates/action-email";
import { ServiceStatusUpdateEmail } from "./templates/service-status-update";
import type { ServiceStatusUpdateEmailProps } from "./templates/service-status-update";

interface RenderedEmail {
  html: string;
  text: string;
}

export const renderEmail = async (
  email: ReactElement
): Promise<RenderedEmail> => {
  const [html, text] = await Promise.all([
    render(email),
    render(email, { plainText: true }),
  ]);

  return { html, text };
};

export const renderActionEmail = (props: ActionEmailProps) =>
  renderEmail(<ActionEmail {...props} />);

export const renderServiceStatusUpdateEmail = (
  props: ServiceStatusUpdateEmailProps
) => renderEmail(<ServiceStatusUpdateEmail {...props} />);
