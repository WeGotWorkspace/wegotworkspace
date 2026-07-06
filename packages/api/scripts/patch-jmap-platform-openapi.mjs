#!/usr/bin/env node
/**
 * Patch openapi/openapi.json with JMAP platform collection CRUD, sync, and tasks paths.
 * Wires Jmap* Error response refs on all /contacts/, /calendars/, /tasks/ operations.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const specPath = path.resolve(packageRoot, "openapi/openapi.json");
const schemasDir = path.resolve(packageRoot, "openapi/schemas");

const spec = JSON.parse(readFileSync(specPath, "utf8"));
spec.components ??= {};
spec.components.schemas ??= {};
spec.components.responses ??= {};
spec.paths ??= {};

const bearer = [{ bearerAuth: [] }];
const userAccess = { "x-wgw-access": "user" };

const errorBody = (description) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

for (const [name, description] of [
  ["JmapBadRequest", "Invalid request"],
  ["JmapForbidden", "Forbidden"],
  ["JmapNotFound", "Resource not found"],
  ["JmapConflict", "Conflict with current resource state"],
  ["JmapPayloadTooLarge", "Payload too large"],
  ["JmapPreconditionFailed", "Precondition failed"],
]) {
  spec.components.responses[name] = errorBody(description);
}

const jmapRef = (name) => ({ $ref: `#/components/responses/Jmap${name}` });

function loadModularSchemas(relativePaths) {
  for (const relativePath of relativePaths) {
    const filePath = path.join(schemasDir, relativePath);
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    for (const [name, schema] of Object.entries(parsed)) {
      spec.components.schemas[name] = schema;
    }
  }
}

loadModularSchemas([
  "calendars/primitives.json",
  "calendars/calendar.json",
  "calendars/calendar-sync.json",
  "contacts/address-book.json",
  "contacts/contact-sync.json",
  "tasks/task-list.json",
  "tasks/task-sync.json",
  "tasks/task.json",
]);

spec.components.schemas.JmapTaskListChangesResponse =
  spec.components.schemas.JmapCalendarChangesResponse;

spec.components.schemas.OkResponse ??= {
  type: "object",
  properties: { ok: { type: "boolean" } },
};

function mergePath(pathKey, pathItem) {
  const existing = spec.paths[pathKey] ?? {};
  spec.paths[pathKey] = { ...existing, ...pathItem };
}

function mergeOperation(pathKey, method, operation) {
  const pathItem = spec.paths[pathKey] ?? {};
  pathItem[method] = { ...(pathItem[method] ?? {}), ...operation };
  spec.paths[pathKey] = pathItem;
}

// --- Contacts: address book CRUD + changes ---
mergeOperation("/contacts/addressbooks", "post", {
  tags: ["Contacts"],
  summary: "Create an address book",
  security: bearer,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/AddressBookCreate" },
      },
    },
  },
  responses: {
    201: {
      description: "Created address book",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/AddressBook" },
        },
      },
    },
  },
  ...userAccess,
});

mergeOperation("/contacts/addressbooks/{addressBookId}", "patch", {
  tags: ["Contacts"],
  summary: "Update an address book",
  security: bearer,
  parameters: [
    { name: "addressBookId", in: "path", required: true, schema: { type: "string" } },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/AddressBookPatch" },
      },
    },
  },
  responses: {
    200: {
      description: "Updated address book",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/AddressBook" },
        },
      },
    },
  },
  ...userAccess,
});

mergeOperation("/contacts/addressbooks/{addressBookId}", "delete", {
  tags: ["Contacts"],
  summary: "Delete an address book",
  security: bearer,
  parameters: [
    { name: "addressBookId", in: "path", required: true, schema: { type: "string" } },
  ],
  requestBody: {
    required: false,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/AddressBookDeleteOptions" },
      },
    },
  },
  responses: {
    200: {
      description: "Address book deleted",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/OkResponse" },
        },
      },
    },
    409: jmapRef("Conflict"),
  },
  ...userAccess,
});

mergePath("/contacts/addressbooks/changes", {
  get: {
    tags: ["Contacts"],
    summary: "Incremental address book collection changes",
    security: bearer,
    parameters: [
      { name: "since", in: "query", required: false, schema: { type: "string" } },
    ],
    responses: {
      200: {
        description: "Address book changes",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/JmapChangesResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
});

mergePath("/contacts/cards/changes", {
  get: {
    tags: ["Contacts"],
    summary: "Incremental contact card changes",
    security: bearer,
    parameters: [
      { name: "addressBookId", in: "query", required: true, schema: { type: "string" } },
      { name: "since", in: "query", required: false, schema: { type: "string" } },
    ],
    responses: {
      200: {
        description: "Contact card changes",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/JmapChangesResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
});

mergePath("/contacts/cards/query", {
  post: {
    tags: ["Contacts"],
    summary: "Query contact card ids",
    security: bearer,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ContactCardQueryRequest" },
        },
      },
    },
    responses: {
      200: {
        description: "Matching contact card ids",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ContactCardQueryResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
});

const cardsGet = spec.paths["/contacts/cards"]?.get;
if (cardsGet) {
  cardsGet.parameters = [
    ...(cardsGet.parameters ?? []),
    { name: "uid", in: "query", required: false, schema: { type: "string" } },
  ];
}

// --- Calendars: collection CRUD + changes ---
mergeOperation("/calendars/calendars", "post", {
  tags: ["Calendars"],
  summary: "Create a calendar",
  security: bearer,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/CalendarCreate" },
      },
    },
  },
  responses: {
    201: {
      description: "Created calendar",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/Calendar" },
        },
      },
    },
  },
  ...userAccess,
});

mergeOperation("/calendars/calendars/{calendarId}", "patch", {
  tags: ["Calendars"],
  summary: "Update a calendar",
  security: bearer,
  parameters: [
    { name: "calendarId", in: "path", required: true, schema: { type: "string" } },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/CalendarPatch" },
      },
    },
  },
  responses: {
    200: {
      description: "Updated calendar",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/Calendar" },
        },
      },
    },
  },
  ...userAccess,
});

mergeOperation("/calendars/calendars/{calendarId}", "delete", {
  tags: ["Calendars"],
  summary: "Delete a calendar",
  security: bearer,
  parameters: [
    { name: "calendarId", in: "path", required: true, schema: { type: "string" } },
  ],
  requestBody: {
    required: false,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/CalendarDeleteOptions" },
      },
    },
  },
  responses: {
    200: {
      description: "Calendar deleted",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/OkResponse" },
        },
      },
    },
    409: jmapRef("Conflict"),
  },
  ...userAccess,
});

mergePath("/calendars/calendars/changes", {
  get: {
    tags: ["Calendars"],
    summary: "Incremental calendar collection changes",
    security: bearer,
    parameters: [
      { name: "since", in: "query", required: false, schema: { type: "string" } },
    ],
    responses: {
      200: {
        description: "Calendar collection changes",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/JmapCalendarChangesResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
});

// --- Tasks: full REST surface ---
mergePath("/tasks/capabilities", {
  get: {
    tags: ["Tasks"],
    summary: "Tasks JMAP capability subset",
    security: bearer,
    responses: {
      200: {
        description: "Tasks capabilities",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TasksCapabilitiesResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
});

mergePath("/tasks/tasklists/changes", {
  get: {
    tags: ["Tasks"],
    summary: "Incremental task list collection changes",
    security: bearer,
    parameters: [
      { name: "since", in: "query", required: false, schema: { type: "string" } },
    ],
    responses: {
      200: {
        description: "Task list changes",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/JmapTaskListChangesResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
});

mergePath("/tasks/tasklists", {
  get: {
    tags: ["Tasks"],
    summary: "List task lists",
    security: bearer,
    responses: {
      200: {
        description: "Task list collection",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TaskTaskListListResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
  post: {
    tags: ["Tasks"],
    summary: "Create a task list",
    security: bearer,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/TaskListCreate" },
        },
      },
    },
    responses: {
      201: {
        description: "Created task list",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TaskList" },
          },
        },
      },
    },
    ...userAccess,
  },
});

mergePath("/tasks/tasklists/{taskListId}", {
  get: {
    tags: ["Tasks"],
    summary: "Fetch a task list",
    security: bearer,
    parameters: [
      { name: "taskListId", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: {
      200: {
        description: "Task list",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TaskList" },
          },
        },
      },
    },
    ...userAccess,
  },
  patch: {
    tags: ["Tasks"],
    summary: "Update a task list",
    security: bearer,
    parameters: [
      { name: "taskListId", in: "path", required: true, schema: { type: "string" } },
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/TaskListPatch" },
        },
      },
    },
    responses: {
      200: {
        description: "Updated task list",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TaskList" },
          },
        },
      },
    },
    ...userAccess,
  },
  delete: {
    tags: ["Tasks"],
    summary: "Delete a task list",
    security: bearer,
    parameters: [
      { name: "taskListId", in: "path", required: true, schema: { type: "string" } },
    ],
    requestBody: {
      required: false,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/TaskListDeleteOptions" },
        },
      },
    },
    responses: {
      200: {
        description: "Task list deleted",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/OkResponse" },
          },
        },
      },
      409: jmapRef("Conflict"),
    },
    ...userAccess,
  },
});

mergePath("/tasks/items/query", {
  post: {
    tags: ["Tasks"],
    summary: "Query task item ids",
    security: bearer,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/TaskItemQueryRequest" },
        },
      },
    },
    responses: {
      200: {
        description: "Matching task ids",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TaskItemQueryResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
});

mergePath("/tasks/items", {
  get: {
    tags: ["Tasks"],
    summary: "List tasks in a task list",
    security: bearer,
    parameters: [
      { name: "taskListId", in: "query", required: true, schema: { type: "string" } },
    ],
    responses: {
      200: {
        description: "Task list items",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TaskListResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
  post: {
    tags: ["Tasks"],
    summary: "Create a task",
    security: bearer,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/TaskCreate" },
        },
      },
    },
    responses: {
      201: {
        description: "Created task",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Task" },
          },
        },
      },
    },
    ...userAccess,
  },
});

mergePath("/tasks/items/{taskId}", {
  get: {
    tags: ["Tasks"],
    summary: "Fetch a task",
    security: bearer,
    parameters: [
      { name: "taskId", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: {
      200: {
        description: "Task",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Task" },
          },
        },
      },
    },
    ...userAccess,
  },
  put: {
    tags: ["Tasks"],
    summary: "Replace a task",
    security: bearer,
    parameters: [
      { name: "taskId", in: "path", required: true, schema: { type: "string" } },
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/TaskCreate" },
        },
      },
    },
    responses: {
      200: {
        description: "Updated task",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Task" },
          },
        },
      },
    },
    ...userAccess,
  },
  patch: {
    tags: ["Tasks"],
    summary: "Partially update a task",
    security: bearer,
    parameters: [
      { name: "taskId", in: "path", required: true, schema: { type: "string" } },
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/TaskPatch" },
        },
      },
    },
    responses: {
      200: {
        description: "Updated task",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Task" },
          },
        },
      },
    },
    ...userAccess,
  },
  delete: {
    tags: ["Tasks"],
    summary: "Delete a task",
    security: bearer,
    parameters: [
      { name: "taskId", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: {
      200: {
        description: "Task deleted",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/OkResponse" },
          },
        },
      },
    },
    ...userAccess,
  },
});

// Fix contacts/blobs inline error descriptions → Jmap* refs
for (const blobPath of ["/contacts/blobs", "/contacts/blobs/{blobId}"]) {
  const pathItem = spec.paths[blobPath];
  if (!pathItem) {
    continue;
  }
  for (const operation of Object.values(pathItem)) {
    if (!operation?.responses) {
      continue;
    }
    if (operation.responses["400"]) {
      operation.responses["400"] = jmapRef("BadRequest");
    }
    if (operation.responses["403"]) {
      operation.responses["403"] = jmapRef("Forbidden");
    }
    if (operation.responses["404"]) {
      operation.responses["404"] = jmapRef("NotFound");
    }
    if (operation.responses["413"]) {
      operation.responses["413"] = jmapRef("PayloadTooLarge");
    }
  }
}

const prefixMatchers = ["/contacts/", "/calendars/", "/tasks/"];
const mutating = new Set(["post", "put", "patch", "delete"]);

for (const [route, pathItem] of Object.entries(spec.paths)) {
  if (!prefixMatchers.some((prefix) => route.startsWith(prefix))) {
    continue;
  }

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!operation || typeof operation !== "object" || !operation.responses) {
      continue;
    }

    const op = method.toLowerCase();
    const merged = { ...operation.responses };

    merged["403"] = jmapRef("Forbidden");

    if (op === "get") {
      if (route.includes("{")) {
        merged["404"] = jmapRef("NotFound");
      } else if (
        route.endsWith("/cards")
        || route.endsWith("/events")
        || route.endsWith("/items")
        || route.endsWith("/changes")
      ) {
        merged["400"] = jmapRef("BadRequest");
        if (!route.endsWith("/changes")) {
          merged["404"] = jmapRef("NotFound");
        }
      }
    }

    if (mutating.has(op)) {
      merged["400"] = jmapRef("BadRequest");
      if (route.includes("{")) {
        merged["404"] = jmapRef("NotFound");
      }
      if (["post", "put", "patch"].includes(op)) {
        merged["413"] = jmapRef("PayloadTooLarge");
      }
      if (["put", "patch", "delete"].includes(op)) {
        merged["412"] = jmapRef("PreconditionFailed");
      }
    }

    operation.responses = merged;
  }
}

writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
console.log("Patched JMAP platform paths and error responses in openapi/openapi.json");
