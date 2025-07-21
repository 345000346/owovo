# Echo Modern Hugo Theme

A modern, clean, and content-focused Hugo theme. This theme is a refactored and decoupled version of the original Echo theme, utilizing Hugo Pipes and Tailwind CSS for a fast and modern experience.

## Features

- **Modern Asset Pipeline:** Uses Hugo Pipes to process CSS and JS.
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
- **Dark Mode:** Switch between light and dark mode.
- **Decoupled:** Theme and content are fully decoupled.

## Installation

1.  **Add the theme as a submodule:**
    ```bash
    git submodule add https://github.com/your-username/echo-modern.git themes/echo-modern
    ```
2.  **Update your `hugo.yaml`:**
    ```yaml
    theme: echo-modern
    ```

## Configuration

You can customize the theme by adding the following parameters to your `hugo.yaml` file.

```yaml
params:
  # Author information
  author:
    avatar: "/images/avatar.webp"
    name: "Your Name"

  # Social links
  social:
    github: "your-github"
    weibo: "your-weibo"
    rss: "/rss.xml"

  # Sections to include in the main post list and archives
  mainSections:
    - post

  # Favicon
  favicon: "/favicon.ico"

  # Subtitle and description
  subtitle: "Your site's subtitle"
  keywords: "keyword1, keyword2, keyword3"
  description: "Your site's description"

  # Enable word count in the footer
  vercount: true

  # Site creation date for the runtime counter
  runtime: "2024-01-01T00:00:00+08:00"

  # Include full content in RSS feed
  rssFullContent: true

  # Navigation items
  navItems:
    - ["Home", "/"]
    - ["Archives", "/archives/"]
    - ["About", "/about/"]
```

## Development

This theme uses `npm` to manage development dependencies.

1.  **Navigate to the theme directory:**
    ```bash
    cd themes/echo-modern
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
Now you can run `hugo server` from the root of your site to see the changes.
