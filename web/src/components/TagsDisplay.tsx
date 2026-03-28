import { Component, For } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { setSearchQuery } from "@/store";

interface TagsDisplayProps {
  tags: string[];
}

const TagsDisplay: Component<TagsDisplayProps> = (props) => {
  const navigate = useNavigate();

  const handleTagClick = (tag: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchQuery(tag);
    void navigate("/");
  };

  return (
    <div class="tags-container">
      <For each={props.tags}>
        {(tag) => (
          <span
            class="tag"
            classList={{
              "tag-clickable": props.clickable !== false,
            }}
            onClick={(e) => handleTagClick(tag, e)}
          >
            {tag}
          </span>
        )}
      </For>
    </div>
  );
};

export default TagsDisplay;
