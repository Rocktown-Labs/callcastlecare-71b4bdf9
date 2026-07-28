interface NitroLike {
  options: {
    buildDir: string;
    virtual: Record<string, string>;
  };
}

const makeWorkflowVirtualHandler = (entryPath: string) => `
import { eventHandler, toRequest } from "h3";
import { POST } from "${entryPath}";

export default eventHandler(async (event) => {
  try {
    return await POST(toRequest(event));
  } catch (error) {
    console.error("Handler error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
`;

export default {
  name: "callcastlecare/workflow-explicit-handlers",
  setup(nitro: NitroLike) {
    const workflowBuildPath = `${nitro.options.buildDir}/workflow`;

    nitro.options.virtual["#workflow/webhook.mjs"] = makeWorkflowVirtualHandler(
      `${workflowBuildPath}/webhook.mjs`
    );
    nitro.options.virtual["#workflow/steps.mjs"] = makeWorkflowVirtualHandler(
      `${workflowBuildPath}/steps.mjs`
    );
    nitro.options.virtual["#workflow/workflows.mjs"] =
      makeWorkflowVirtualHandler(`${workflowBuildPath}/workflows.mjs`);
  },
};
