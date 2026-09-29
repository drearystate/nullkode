import type { ModuleDefinition } from "../types";

export const forum: ModuleDefinition = {
  id: "forum",
  name: "Forum",
  tagline: "Discussion topics with threaded replies",
  description:
    "A community forum with topics and real replies. Visitors start a topic from the forum home, click through to a detail page, and post replies. Reply counts update automatically on each reply.",
  icon: "",
  color: "from-indigo-500 to-violet-600",
  category: "community",
  version: "1.1.0",
  config: [
    {
      key: "forumName",
      label: "Forum name",
      type: "text",
      default: "Community Forum",
      required: true,
    },
  ],
  tables: [
    {
      name: "topics",
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "author", type: "text" },
        { name: "category", type: "text" },
        { name: "reply_count", type: "int" },
      ],
    },
    {
      name: "replies",
      fields: [
        { name: "topic_id", type: "text" },
        { name: "author", type: "text" },
        { name: "body", type: "text" },
      ],
    },
  ],
  flows: [
    {
      slug: "new-topic",
      name: "Start topic",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "topics",
            values: {
              title: "{{trigger.title}}",
              body: "{{trigger.body}}",
              author: "{{trigger.author}}",
              category: "{{trigger.category}}",
              reply_count: "0",
            },
            output: "topic",
          },
        },
        {
          id: "n3",
          type: "response",
          data: {
            status: 200,
            body: '{"ok":true,"redirect":"./{{page.topic-detail}}?id={{vars.topic.id}}"}',
          },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "topics",
      name: "List topics",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "topics",
            orderBy: "created_at desc",
            limit: 200,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "topic-by-id",
      name: "Load topic",
      httpMethod: "POST",
      purpose:
        "Returns a single topic as a one-row array so the detail page can bind the topic header the same way it binds list rows.",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "topics",
            where: { id: "{{trigger.id}}" },
            limit: 1,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "topic-replies",
      name: "List topic replies",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "query",
          data: {
            table: "replies",
            where: { topic_id: "{{trigger.id}}" },
            orderBy: "created_at asc",
            limit: 500,
            output: "rows",
          },
        },
        {
          id: "n3",
          type: "response",
          data: { status: 200, body: "{{vars.rows}}" },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ],
    },
    {
      slug: "new-reply",
      name: "Post reply",
      httpMethod: "POST",
      purpose:
        "Inserts a reply, re-reads the topic's current reply_count, adds one, and updates the topic. Race-safe enough for a community forum.",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        {
          id: "n2",
          type: "insert",
          data: {
            table: "replies",
            values: {
              topic_id: "{{trigger.topic_id}}",
              author: "{{trigger.author}}",
              body: "{{trigger.body}}",
            },
            output: "reply",
          },
        },
        {
          id: "n3",
          type: "query",
          data: {
            table: "topics",
            where: { id: "{{trigger.topic_id}}" },
            limit: 1,
            output: "topicRows",
          },
        },
        {
          id: "n4",
          type: "math",
          data: {
            left: "{{vars.topicRows.0.reply_count}}",
            op: "+",
            right: "1",
            output: "newCount",
          },
        },
        {
          id: "n5",
          type: "update",
          data: {
            table: "topics",
            where: { id: "{{trigger.topic_id}}" },
            values: { reply_count: "{{vars.newCount}}" },
          },
        },
        {
          id: "n6",
          type: "response",
          data: {
            status: 200,
            body: '{"ok":true,"redirect":"./{{page.topic-detail}}?id={{trigger.topic_id}}"}',
          },
        },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
        { id: "e4", source: "n4", target: "n5" },
        { id: "e5", source: "n5", target: "n6" },
      ],
    },
  ],
  pages: [
    {
      slug: "forum",
      title: "Forum",
      html: `<section class="nk-hero"><div class="container"><span class="nk-eyebrow">COMMUNITY</span><h1 class="display-4 fw-bold mb-2">{{config.forumName}}</h1><p class="lead">Start a topic, join the discussion.</p></div></section>
<section class="py-5"><div class="container">
<div data-nk-bind-flow-ref="topics">
  <a data-nk-item class="card mb-2 text-decoration-none text-body hoverable d-block" data-nk-attr-href="./{{page.topic-detail}}?id={id}" href="#">
    <div class="card-body d-flex align-items-center gap-3">
      <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold" style="color:#fff;width:44px;height:44px;min-width:44px;background:var(--nk-primary);">T</div>
      <div class="flex-grow-1">
        <div class="fw-bold" data-nk-field="title">Topic title</div>
        <div class="small" style="color:var(--nk-text-muted);">by <span data-nk-field="author">Author</span> in <span style="color:var(--nk-primary);" data-nk-field="category">General</span></div>
      </div>
      <div class="text-center">
        <div class="fw-bold"><span data-nk-field="reply_count">0</span></div>
        <div class="small" style="color:var(--nk-text-muted);">replies</div>
      </div>
    </div>
  </a>
</div>
</div></section>
<section class="py-5" style="background:var(--nk-surface-2);"><div class="container" style="max-width:720px;">
<h3 class="fw-bold">Start a new topic</h3>
<form data-nk-form="" data-nk-flow-ref="new-topic" class="card p-4 mt-3 shadow-sm">
  <div class="row g-3">
    <div class="col-md-8"><label class="form-label">Title</label><input name="title" class="form-control" required/></div>
    <div class="col-md-4"><label class="form-label">Category</label><select name="category" class="form-select"><option>General</option><option>Support</option><option>Show &amp; Tell</option><option>Feedback</option></select></div>
    <div class="col-md-6"><label class="form-label">Your name</label><input name="author" class="form-control" required/></div>
    <div class="col-12"><label class="form-label">Message</label><textarea name="body" class="form-control" rows="4" required></textarea></div>
    <div class="col-12 text-end"><button class="btn btn-primary" type="submit">Post topic</button></div>
  </div>
  <div data-nk-error class="text-danger small mt-3"></div>
</form>
</div></section>`,
    },
    {
      slug: "topic-detail",
      title: "Topic",
      html: `<section class="nk-hero" style="padding-block:clamp(2.5rem,5vw,4rem);"><div class="container"><a class="small" data-nk-attr-href="./{{page.forum}}" href="#">← Back to forum</a></div></section>
<section class="py-4"><div class="container" style="max-width:820px;">

<div data-nk-bind-flow-ref="topic-by-id">
  <article data-nk-item class="card shadow-sm mb-4">
    <div class="card-body">
      <div class="nk-eyebrow mb-2" data-nk-field="category">General</div>
      <h1 class="fw-bold mb-2" data-nk-field="title">Topic title</h1>
      <div class="small mb-3" style="color:var(--nk-text-muted);">by <span data-nk-field="author">Author</span></div>
      <p class="mb-0" style="white-space:pre-wrap;" data-nk-field="body">Topic body…</p>
    </div>
  </article>
</div>

<h3 class="fw-bold mb-3">Replies</h3>
<div data-nk-bind-flow-ref="topic-replies">
  <div data-nk-item class="card mb-2">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start">
        <div class="fw-semibold" data-nk-field="author">Author</div>
        <div class="small" style="color:var(--nk-text-muted);" data-nk-field="created_at">time</div>
      </div>
      <div class="mt-2" style="white-space:pre-wrap;" data-nk-field="body">Reply…</div>
    </div>
  </div>
</div>

<form data-nk-form="" data-nk-flow-ref="new-reply" class="card p-4 mt-4 shadow-sm">
  <h4 class="fw-bold mb-3">Add a reply</h4>
  <input type="hidden" name="topic_id" data-nk-qs-field="id"/>
  <div class="mb-3"><label class="form-label">Your name</label><input name="author" class="form-control" required/></div>
  <div class="mb-3"><label class="form-label">Your reply</label><textarea name="body" class="form-control" rows="4" required></textarea></div>
  <div class="text-end"><button class="btn btn-primary" type="submit">Post reply</button></div>
  <div data-nk-error class="text-danger small mt-2"></div>
</form>

</div></section>`,
    },
  ],
};
