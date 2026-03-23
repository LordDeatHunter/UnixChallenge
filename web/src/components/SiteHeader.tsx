import type { Component } from "solid-js";
import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { API_URL, currentUser, isLoadingUser, logout } from "@/store";

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

      <Show when={!isLoadingUser()}>
        <Show
          when={currentUser()}
          fallback={
            <a
              href={`${API_URL}/auth/github`}
              class="site-header-link site-header-login"
            >
              Login with GitHub
            </a>
          }
        >
          {(user) => (
            <div class="site-header-user">
              <Show when={user().profile_picture_url}>
                <img
                  src={user().profile_picture_url!}
                  alt={user().username}
                  class="site-header-avatar"
                  width={28}
                  height={28}
                />
              </Show>
              <span class="site-header-username">{user().username}</span>
              <button
                type="button"
                class="site-header-link site-header-logout"
                onClick={() => void logout()}
              >
                Logout
              </button>
            </div>
          )}
        </Show>
      </Show>
    </nav>
  </header>
);

export default SiteHeader;
