import type { Component } from "solid-js";
import { Show, createSignal, onCleanup } from "solid-js";
import { A } from "@solidjs/router";
import {
  API_URL,
  currentUser,
  isLoadingUser,
  keyboardSoundsEnabled,
  logout,
  startGithubLogin,
  setKeyboardSoundsEnabled,
} from "@/store";

interface SiteHeaderProps {
  showChallengesLink?: boolean;
  isChallengesPage?: boolean;
}

const SiteHeader: Component<SiteHeaderProps> = (props) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = createSignal(false);
  let userMenuRef: HTMLDivElement | undefined;

  const onDocumentPointerDown = (event: MouseEvent) => {
    if (!isUserMenuOpen() || !userMenuRef) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && !userMenuRef.contains(target)) {
      setIsUserMenuOpen(false);
    }
  };

  const onEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsUserMenuOpen(false);
    }
  };

  document.addEventListener("mousedown", onDocumentPointerDown);
  document.addEventListener("keydown", onEscape);
  onCleanup(() => {
    document.removeEventListener("mousedown", onDocumentPointerDown);
    document.removeEventListener("keydown", onEscape);
  });

  return (
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
        <h1>Unix Challenge</h1>
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
                onClick={(event) => {
                  event.preventDefault();
                  startGithubLogin();
                }}
              >
                Login with GitHub
              </a>
            }
          >
            {(user) => (
              <div class="site-header-user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  class="site-header-avatar-trigger"
                  aria-label="Open user menu"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen()}
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                >
                  <Show
                    when={user().profile_picture_url}
                    fallback={
                      <span class="site-header-avatar-fallback" aria-hidden="true">
                        {user().username.slice(0, 1).toUpperCase()}
                      </span>
                    }
                  >
                    <img
                      src={user().profile_picture_url!}
                      alt={user().username}
                      class="site-header-avatar"
                      width={36}
                      height={36}
                    />
                  </Show>
                </button>

                <Show when={isUserMenuOpen()}>
                  <div class="site-header-user-dropdown" role="menu">
                    <p class="site-header-user-dropdown-name">{user().username}</p>
                    <button
                      type="button"
                      class="site-header-user-dropdown-toggle"
                      aria-pressed={keyboardSoundsEnabled()}
                      onClick={() =>
                        setKeyboardSoundsEnabled(!keyboardSoundsEnabled())
                      }
                    >
                      <span class="site-header-user-dropdown-toggle-label">
                        Keyboard SFX
                      </span>
                      <span class="site-header-user-dropdown-toggle-value">
                        {keyboardSoundsEnabled() ? "On" : "Off"}
                      </span>
                    </button>
                    <button
                      type="button"
                      class="site-header-user-dropdown-logout"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        void logout();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </Show>
      </nav>
    </header>
  );
};

export default SiteHeader;
