import { Component, For } from "solid-js";

interface TagsDisplayProps {
  tags: string[];
}

const TagsDisplay: Component<TagsDisplayProps> = (props) => (
  <div class="tags-container">
    <For each={props.tags}>{(tag) => <span class="tag">{tag}</span>}</For>
  </div>
);

export default TagsDisplay;
