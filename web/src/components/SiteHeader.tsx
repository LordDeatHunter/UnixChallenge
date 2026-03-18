import type { Component } from "solid-js";
import { A } from "@solidjs/router";

interface SiteHeaderProps {
  title: string;
  showChallengesLink?: boolean;
  isChallengesPage?: boolean;
}

const SiteHeader: Component<SiteHeaderProps> = (props) => (
  <header class="site-header">
    <div class="site-header-main">
      <A href="/" class="site-header-logo-link" aria-label="Go to challenges">
        <span class="logo-stack">
          <img
            src="/assets/unix-challenge-inverse.png"
            alt=""
            aria-hidden="true"
            class="logo logo-inverse"
          />
          <img
            src="/assets/unix-challenge.png"
            alt="Unix Challenge"
            class="logo logo-main"
          />
        </span>
      </A>
      <h1>{props.title}</h1>
    </div>

    <nav class="site-header-nav" aria-label="Primary navigation">
      {props.showChallengesLink !== false && (
        <A
          href="/"
          class="site-header-link"
          aria-current={props.isChallengesPage ? "page" : undefined}
        >
          Challenges
        </A>
      )}
    </nav>
  </header>
);

export default SiteHeader;
