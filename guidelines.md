# Response Guidelines for AI Assistance

When providing technical assistance, I will follow these guidelines to ensure clear, actionable instructions:

## Documentation First Approach
1. Always check official documentation for @TailwindUI, @TailwindCSS, @NextJS, @Superbase and @YouTubeAPI before implementing solutions
2. Reference specific documentation sections to support implementation choices
3. Stay current with latest API changes and deprecations
4. Compare multiple documentation sources when discrepancies exist
5. Prioritize official documentation over third-party tutorials

## Proactive Planning
1. Think through the entire process before writing any code
2. Identify potential edge cases and failure points upfront
3. Consider scalability implications of proposed solutions
4. Map dependencies between different system components
5. Document assumptions being made about the environment or requirements
6. Develop architectural diagrams when complexity warrants

## Proactive Action
1. Create files and implement solutions directly whenever possible, without asking the user to do it
2. Provide complete, ready-to-use code rather than just instructions
3. Take initiative to solve problems without requiring user intervention
4. Anticipate next steps and prepare solutions in advance
5. When file creation is required, generate the file content directly instead of asking the user to create it
6. Implement complete solutions that are immediately usable

## Design Quality
1. Always reference and use @TailwindCSS properly in all projects
2. Ensure UI components look professional and polished
3. Follow modern design principles and best practices
4. Never deliver solutions that "look like shit"
5. Use proper spacing, typography, and color principles
6. Maintain visual hierarchy and accessibility standards

## Step-by-Step Structure
1. Break down complex tasks into clear, sequential steps
2. Number each step for easy reference
3. Present steps in logical order of execution
4. Indicate dependencies between steps

## Command Clarity
1. Provide complete commands that can be copied and pasted
2. Use code blocks for all commands and configuration
3. Include expected output or success indicators
4. Specify which terminal/environment to run commands in

## File Modifications
1. Show exact file paths for all changes
2. Use diff format to clearly show what to add/remove
3. Include context lines around changes
4. Provide complete file content for new files

## Explanations
1. Explain what each command or change accomplishes
2. Include why a step is necessary, not just how to do it
3. Highlight potential issues or variations
4. Use plain language and avoid unnecessary jargon

## Troubleshooting
1. Anticipate common errors for each step
2. Provide specific error messages to watch for
3. Include resolution steps for likely problems
4. Offer verification commands to check success

## Platform Awareness
1. Note platform-specific differences (Windows/Mac/Linux)
2. Provide alternative approaches when platform matters
3. Specify any prerequisites for different environments
4. Use platform-appropriate commands and paths

## Visual Organization
1. Use headings and subheadings for clear sections
2. Apply consistent formatting for similar elements
3. Highlight critical warnings or notes
4. Use lists for multiple related items

## Follow-up
1. Confirm completion indicators for each major step
2. Suggest next steps after successful completion
3. Offer ways to verify the entire process worked
4. Provide resources for further learning or customization

## Expert Engineering Practices
1. Apply SOLID principles and design patterns appropriately
2. Implement proper error handling and logging strategies
3. Write unit and integration tests for critical functionality
4. Use dependency injection to improve testability
5. Follow language-specific idiomatic practices and conventions
6. Optimize for performance without premature optimization
7. Consider security implications in all implementation decisions
8. Use typed interfaces/contracts when available
9. Implement proper validation for all external inputs
10. Ensure backwards compatibility when modifying existing code

## Code Quality
1. Maintain consistent code style within project context
2. Use meaningful variable and function names
3. Implement appropriate comments for complex logic
4. Keep functions small and focused on single responsibility
5. Minimize global state and side effects
6. Structure code for maximum readability
7. Apply proper abstraction levels to hide implementation details
8. Use appropriate data structures for optimal performance
9. Implement proper error boundaries and recovery mechanisms
10. Follow established coding standards for each language

## System Architecture
1. Consider service boundaries and communication protocols
2. Implement appropriate caching strategies
3. Design for horizontal scaling where applicable
4. Consider data consistency vs. availability tradeoffs
5. Implement proper authentication and authorization mechanisms
6. Use asynchronous processing for non-blocking operations
7. Design clear API contracts between system components
8. Apply appropriate database normalization and indexing
9. Implement proper monitoring and observability hooks
10. Consider deployment and operations requirements

## Content Rendering and Sanitization
1. Always sanitize user-generated content before rendering
2. Use proper HTML parsing for content containing HTML tags
3. For content with `<br>` tags or other HTML:
   - Either use a sanitizer + dangerouslySetInnerHTML
   - Or convert HTML to appropriate text/React elements
4. Never render raw HTML strings directly in React components
5. Test rendering with sample content containing HTML tags
6. Consider line breaks, special characters, and emojis in rendering tests
7. Always use proper content encoding when transferring between API and frontend
8. **When handling YouTube API comment data:**
   - YouTube API provides comments in two formats:
     - `textDisplay`: Contains HTML-formatted text (with <br> tags for line breaks)
     - `textOriginal`: Contains the raw, unformatted text
   - **Always use the `sanitizeAndRenderHtml` utility from `lib/content-utils.ts` when rendering `textDisplay`**
   - Never render `textDisplay` directly with dangerouslySetInnerHTML without sanitization
   - Remember that `textDisplay` can contain various HTML elements including <br> tags
   - For components that need plain text, use `convertHtmlToText` from `lib/content-utils.ts`
9. **For consistent rendering across components:**
   - Prefer a shared utility approach over inline solutions
   - Use the same HTML sanitization configuration in all places
   - Test with real YouTube comments containing various HTML elements
10. **Always implement proper XSS protection:**
    - Use DOMPurify to sanitize HTML
    - Whitelist only necessary tags (b, i, em, strong, a, br, p)
    - Whitelist only necessary attributes (href, target, rel)

# Design System Documentation

## Page Hierarchy

Every page should follow this hierarchy pattern:

1. **Application Header (H1)**: Only displays "Commenter" once as the application name
2. **Page Title (H2)**: Clear page purpose (e.g., "Comment Analysis")
3. **Section Titles (H3)**: Major sections within the page
4. **Component Titles (H4)**: Headings within components

## Component Architecture

### Comments Module

We follow a clear component separation pattern:

1. **Container Components**: Handle data fetching and state management
   - CommentSection
   - CommentFilter

2. **Presentational Components**: Handle rendering only
   - CommentList
   - CommentItem
   - CommentReply

3. **Utility Components**: Reusable UI elements
   - Pagination
   - LoadingState
   - EmptyState

### Component Composition Rules

1. Container components should never be nested in other container components
2. Presentational components receive data only through props
3. State should be lifted to the appropriate container level
4. Use composition over inheritance

## Design Tokens

Our design system uses tokens for consistency across:

1. **Spacing**: Page, card, stack spacing
2. **Typography**: Title and body text styles
3. **Colors**: Primary color palette and grays
4. **Shadows**: Box shadows for different elevation levels
5. **Rounded**: Border radius tokens

Use the `tokens` and `componentStyles` from `lib/design-system.ts`.

## Accessibility Guidelines

1. All interactive elements must be keyboard accessible
2. Proper semantic HTML structure
3. Color contrast meets WCAG AA standards
4. All images have meaningful alt text
5. ARIA attributes used appropriately

## Responsive Design

1. Mobile-first approach
2. Page container uses consistent max width
3. Stack layout elements in small screens
4. Use appropriate text sizes for different screens 