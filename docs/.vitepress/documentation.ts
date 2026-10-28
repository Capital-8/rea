// Authored guide ownership: physical sources and stable public routes.
export const documentationSections = [
  {
    text: "Getting started",
    items: [
      {
        text: "Installation and setup",
        source: "getting-started/installation.md",
        route: "/installation",
      },
      {
        text: "Client configuration and troubleshooting",
        source: "getting-started/client-configuration.md",
        route: "/client-configuration",
      },
      {
        text: "CLI and Evidence",
        source: "getting-started/cli.md",
        route: "/cli",
      },
      {
        text: "Guided MCP prompts and completion",
        source: "getting-started/mcp-prompts.md",
        route: "/mcp-prompts",
      },
    ],
  },
  {
    text: "Native binaries",
    items: [
      {
        text: "Native binary investigation",
        source: "guides/native/native-investigation.md",
        route: "/native-investigation",
      },
      {
        text: "Go binary build metadata",
        source: "guides/native/go-binaries.md",
        route: "/go-binaries",
      },
      {
        text: "Offline binary diagnostics",
        source: "guides/native/binary-diagnostics.md",
        route: "/binary-diagnostics",
      },
      {
        text: "Recorded crash evidence",
        source: "guides/native/recorded-crashes.md",
        route: "/recorded-crashes",
      },
    ],
  },
  {
    text: "JavaScript and Electron",
    items: [
      {
        text: "JavaScript Application Graph",
        source: "guides/javascript/javascript-application-graph.md",
        route: "/javascript-application-graph",
      },
      {
        text: "Cross-layer JavaScript application workflows",
        source: "guides/javascript/javascript-application-workflows.md",
        route: "/javascript-application-workflows",
      },
      {
        text: "JavaScript artifact reconstruction",
        source: "guides/javascript/javascript-artifact-reconstruction.md",
        route: "/javascript-artifact-reconstruction",
      },
      {
        text: "JavaScript source recovery",
        source: "guides/javascript/javascript-recovery.md",
        route: "/javascript-recovery",
      },
      {
        text: "Passive Node and Electron runtime observation",
        source: "guides/javascript/javascript-runtime-observation.md",
        route: "/javascript-runtime-observation",
      },
      {
        text: "JavaScript static/runtime reconciliation",
        source: "guides/javascript/javascript-runtime-reconciliation.md",
        route: "/javascript-runtime-reconciliation",
      },
      {
        text: "Electron file-page observation",
        source: "guides/javascript/electron-observation.md",
        route: "/electron-observation",
      },
    ],
  },
  {
    text: "Browser and captured websites",
    items: [
      {
        text: "Website observation with CDP",
        source: "guides/web/browser-observation.md",
        route: "/browser-observation",
      },
      {
        text: "Browser scenario contract",
        source: "guides/web/browser-scenario-contract.md",
        route: "/browser-scenario-contract",
      },
      {
        text: "Website runtime source attribution",
        source: "guides/web/web-runtime.md",
        route: "/web-runtime",
      },
      {
        text: "Historical web network captures",
        source: "guides/web/web-network-captures.md",
        route: "/web-network-captures",
      },
      {
        text: "HTTP/3 capture lab",
        source: "http3-capture-lab.md",
        route: "/http3-capture-lab",
      },
      {
        text: "Captured website source locations",
        source: "guides/web/web-source-location.md",
        route: "/web-source-location",
      },
      {
        text: "Captured website module relationships",
        source: "guides/web/website-module-trace.md",
        route: "/website-module-trace",
      },
      {
        text: "Captured website scripts and static JavaScript analysis",
        source: "guides/web/website-script-export.md",
        route: "/website-script-export",
      },
    ],
  },
  {
    text: "Android applications",
    items: [
      {
        text: "Static Android APK analysis",
        source: "guides/android/android-analysis.md",
        route: "/android-analysis",
      },
      {
        text: "Apktool resource decoding",
        source: "guides/android/apktool-resource-analysis.md",
        route: "/apktool-resource-analysis",
      },
      {
        text: "ADB device inspection and acquisition",
        source: "guides/android/adb-device-analysis.md",
        route: "/adb-device-analysis",
      },
      {
        text: "Flutter build identification",
        source: "guides/android/flutter-analysis.md",
        route: "/flutter-analysis",
      },
    ],
  },
  {
    text: "Apple applications",
    items: [
      {
        text: "Apple Application Inventory Projection",
        source: "guides/apple/apple-application-analysis.md",
        route: "/apple-application-analysis",
      },
    ],
  },
  {
    text: ".NET assemblies",
    items: [
      {
        text: "Managed-code analysis",
        source: "guides/managed/managed-code-analysis.md",
        route: "/managed-code-analysis",
      },
    ],
  },
  {
    text: "Firmware",
    items: [
      {
        text: "Firmware analysis",
        source: "guides/firmware/firmware-analysis.md",
        route: "/firmware-analysis",
      },
    ],
  },
  {
    text: "HarmonyOS packages",
    items: [
      {
        text: "Static HarmonyOS package inventory",
        source: "guides/harmony/harmony-analysis.md",
        route: "/harmony-analysis",
      },
    ],
  },
  {
    text: "WebAssembly",
    items: [
      {
        text: "Offline WebAssembly artifacts",
        source: "guides/wasm/wasm-artifacts.md",
        route: "/wasm-artifacts",
      },
    ],
  },
  {
    text: "EVM contracts",
    items: [
      {
        text: "Offline EVM bytecode",
        source: "guides/evm/evm-bytecode.md",
        route: "/evm-bytecode",
      },
    ],
  },
  {
    text: "Databases and recorded packets",
    items: [
      {
        text: "SQLite database snapshots",
        source: "guides/data/sqlite-databases.md",
        route: "/sqlite-databases",
      },
      {
        text: "Recorded packet capture inspection",
        source: "guides/data/packet-captures.md",
        route: "/packet-captures",
      },
      {
        text: "Packet capture summaries",
        source: "guides/data/pcap-analysis.md",
        route: "/pcap-analysis",
      },
    ],
  },
  {
    text: "Process capture and instrumentation",
    items: [
      {
        text: "Process capture",
        source: "guides/runtime/process-capture.md",
        route: "/process-capture",
      },
      {
        text: "Frida instrumentation",
        source: "guides/runtime/frida-instrumentation.md",
        route: "/frida-instrumentation",
      },
    ],
  },
  {
    text: "Provider setup and formats",
    items: [
      {
        text: "Ghidra provider semantics",
        source: "providers/ghidra-provider.md",
        route: "/ghidra-provider",
      },
      {
        text: "DOS MZ and COM analysis with Ghidra",
        source: "providers/ghidra-dos.md",
        route: "/ghidra-dos",
      },
      {
        text: "Optional NativeAOT metadata recovery",
        source: "providers/ghidra-nativeaot.md",
        route: "/ghidra-nativeaot",
      },
      {
        text: "MIPS ELF analysis through Ghidra",
        source: "providers/ghidra-mips.md",
        route: "/ghidra-mips",
      },
      {
        text: "PSP static ELF analysis through Ghidra",
        source: "providers/ghidra-psp.md",
        route: "/ghidra-psp",
      },
      {
        text: "RISC-V ELF analysis through Ghidra",
        source: "providers/ghidra-riscv.md",
        route: "/ghidra-riscv",
      },
      {
        text: "Windows Ghidra P0",
        source: "providers/windows-ghidra-p0.md",
        route: "/windows-ghidra-p0",
      },
      {
        text: "Headerless raw-binary analysis with Ghidra",
        source: "providers/raw-binary.md",
        route: "/raw-binary",
      },
      {
        text: "IDA provider",
        source: "providers/ida-provider.md",
        route: "/ida-provider",
      },
      {
        text: "JEB instrumentation and analysis",
        source: "providers/jeb-analysis.md",
        route: "/jeb-analysis",
      },
    ],
  },
  {
    text: "Contracts and evidence",
    items: [
      {
        text: "MCP runtime contracts",
        source: "reference/mcp-contracts.md",
        route: "/mcp-contracts",
      },
      {
        text: "Reconstruction obligation ledgers",
        source: "reference/reconstruction-obligation-ledgers.md",
        route: "/reconstruction-obligation-ledgers",
      },
    ],
  },
  {
    text: "Development and verification",
    items: [
      {
        text: "MCP tool design",
        source: "development/tool-design.md",
        route: "/tool-design",
      },
      {
        text: "Testing REA",
        source: "development/testing.md",
        route: "/testing",
      },
      {
        text: "Client and agent verification",
        source: "development/client-verification.md",
        route: "/client-verification",
      },
      {
        text: "Reconstruction readiness conformance",
        source: "development/reconstruction-readiness.md",
        route: "/reconstruction-readiness",
      },
      {
        text: "Releasing REA",
        source: "development/releasing.md",
        route: "/releasing",
      },
      {
        text: "REA roadmap",
        source: "development/roadmap.md",
        route: "/roadmap",
      },
    ],
  },
  {
    text: "Release migrations",
    items: [
      {
        text: "Upgrading from REA 6.1 to 6.2",
        source: "migrations/migration-6.2.md",
        route: "/migration-6.2",
      },
    ],
  },
  {
    text: "Signal recordings",
    items: [
      {
        text: "Recorded signal inspection",
        source: "guides/signals/signal-recordings.md",
        route: "/signal-recordings",
      },
    ],
  },
];

export const documentationRewrites = Object.fromEntries(
  documentationSections.flatMap((section) =>
    section.items.flatMap((item) => {
      const target = `${item.route.slice(1)}.md`;
      return item.source === target ? [] : [[item.source, target]];
    }),
  ),
);
