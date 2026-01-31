import { QuestionBank } from './questions';

export const QUESTION_BANK: QuestionBank = {
  'Angular and History': [
    {
      statement:
        'Which statement best describes Angular (2+) compared to AngularJS (1.x)?',
      explanation:
        'Angular (2+) is a complete rewrite of AngularJS. It introduced a component-based architecture, TypeScript, improved dependency injection, and better performance.',
      options: [
        {
          text: 'It is a small incremental update that keeps the same architecture.',
          isCorrect: false,
        },
        {
          text: 'It is a complete rewrite with major architectural changes.',
          isCorrect: true,
        },
        { text: 'It is only a templating library.', isCorrect: false },
        { text: 'It is a plugin that extends AngularJS.', isCorrect: false },
      ],
    },
    {
      statement:
        'What was the primary way of building user interfaces in AngularJS (1.x)?',
      explanation:
        'AngularJS relied heavily on controllers, directives, and the $scope object to manage application logic and UI behavior.',
      options: [
        { text: 'Standalone components', isCorrect: false },
        { text: 'Controllers and directives', isCorrect: true },
        { text: 'Signals', isCorrect: false },
        { text: 'Native Web Components', isCorrect: false },
      ],
    },
    {
      statement:
        'Why did Angular (2+) adopt TypeScript as its primary language?',
      explanation:
        'TypeScript provides static typing, better tooling, improved maintainability, and scalability for large applications—key goals for Angular.',
      options: [
        { text: 'Because JavaScript was deprecated', isCorrect: false },
        {
          text: 'To improve tooling, type safety, and scalability',
          isCorrect: true,
        },
        { text: 'To avoid using HTML templates', isCorrect: false },
        { text: 'To support only functional programming', isCorrect: false },
      ],
    },
    {
      statement:
        'One of the main motivations for rewriting Angular was to improve:',
      explanation:
        'AngularJS had performance and architectural limitations, especially for large apps and mobile scenarios. Angular (2+) was designed to address these issues.',
      options: [
        { text: 'Backward compatibility with jQuery', isCorrect: false },
        { text: 'Performance and mobile support', isCorrect: true },
        { text: 'Server-side rendering only', isCorrect: false },
        { text: 'Browser plugin integration', isCorrect: false },
      ],
    },
    {
      statement:
        'What major architectural shift did Angular (2+) introduce compared to AngularJS?',
      explanation:
        'Angular moved away from controller-and-scope patterns toward a component-based architecture, improving reusability and maintainability.',
      options: [
        { text: 'From components to controllers', isCorrect: false },
        { text: 'From MVC to purely functional programming', isCorrect: false },
        { text: 'From controllers and scopes to components', isCorrect: true },
        { text: 'From templates to inline HTML only', isCorrect: false },
      ],
    },
  ],
};

QUESTION_BANK['Angular Architecture'] = [
  {
    statement:
      'Which description best matches Angular’s architectural approach?',
    explanation:
      'Angular encourages a modular, component-based architecture. Applications are commonly structured into modules (or standalone feature boundaries), components, and services to improve maintainability and reusability.',
    options: [
      {
        text: 'A monolithic architecture where all logic lives in one global file.',
        isCorrect: false,
      },
      {
        text: 'A modular, component-based architecture with reusable services.',
        isCorrect: true,
      },
      {
        text: 'A server-only framework where UI is not part of the architecture.',
        isCorrect: false,
      },
      {
        text: 'A template-only library without dependency injection.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'In Angular architecture, what is the primary role of a module (NgModule) or a feature boundary?',
    explanation:
      'A module/feature boundary groups related building blocks (components, directives, pipes, services) and helps with encapsulation and reusability. In modern Angular, standalone APIs can reduce reliance on NgModules, but the grouping/boundary concept remains important.',
    options: [
      { text: 'To replace all components with directives.', isCorrect: false },
      {
        text: 'To group related building blocks into cohesive units.',
        isCorrect: true,
      },
      { text: 'To prevent routing from working.', isCorrect: false },
      {
        text: 'To force all services to be recreated on every component render.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'What is the best definition of a Component in Angular architecture?',
    explanation:
      'A component is a fundamental building block that represents a part of the UI. It typically consists of a class (behavior), a template (view), and styles (presentation).',
    options: [
      { text: 'A database layer used for persistence.', isCorrect: false },
      {
        text: 'A UI building block composed of class + template + (optional) styles.',
        isCorrect: true,
      },
      {
        text: 'A special kind of route guard that blocks navigation.',
        isCorrect: false,
      },
      { text: 'A replacement for services.', isCorrect: false },
    ],
  },
  {
    statement:
      'What is the main architectural purpose of a Service in Angular?',
    explanation:
      'Services encapsulate reusable business logic, data manipulation, and communication with external APIs so multiple components can share behavior and data.',
    options: [
      { text: 'To define HTML structure and CSS styling.', isCorrect: false },
      {
        text: 'To encapsulate reusable logic and share it across components.',
        isCorrect: true,
      },
      { text: 'To replace the router configuration.', isCorrect: false },
      { text: 'To render the UI without templates.', isCorrect: false },
    ],
  },
  {
    statement:
      'Which Angular feature enables sharing services and other dependencies across the application in a structured way?',
    explanation:
      'Dependency Injection (DI) is a core Angular concept that provides and injects dependencies (like services) where needed, improving testability and reuse.',
    options: [
      { text: 'String interpolation', isCorrect: false },
      { text: 'Dependency Injection (DI)', isCorrect: true },
      { text: 'Two-way data binding only', isCorrect: false },
      { text: 'CSS encapsulation', isCorrect: false },
    ],
  },
  {
    statement:
      'According to Angular’s style guidance, how should you organize an application’s folders as it grows?',
    explanation:
      "A common recommendation is to organize by feature areas (domains/themes) rather than by code type (e.g., avoiding top-level folders like 'components/' or 'services/').",
    options: [
      {
        text: 'By file type (components/, services/, directives/) at the top level.',
        isCorrect: false,
      },
      {
        text: 'By feature areas or cohesive themes (feature-based structure).',
        isCorrect: true,
      },
      { text: 'By random alphabetical grouping of files.', isCorrect: false },
      {
        text: 'By placing everything directly under src/ with no subfolders.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'Which project-structure rule best supports maintainability in large Angular apps?',
    explanation:
      'Keeping one concept per file (typically one component/directive/service per file) keeps files focused and easier to navigate and maintain.',
    options: [
      {
        text: 'Put multiple unrelated components in a single file to reduce file count.',
        isCorrect: false,
      },
      {
        text: 'Prefer one component/directive/service per file when possible.',
        isCorrect: true,
      },
      {
        text: 'Keep all tests in a single global tests/ directory.',
        isCorrect: false,
      },
      {
        text: 'Use generic filenames like helpers.ts and utils.ts everywhere.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      "Why is it recommended to avoid overly generic filenames like 'utils.ts' or 'helpers.ts'?",
    explanation:
      'Overly generic files often become dumping grounds for unrelated code, which harms discoverability and maintainability. Prefer names that reflect a clear, cohesive theme.',
    options: [
      {
        text: 'Because Angular cannot compile generic filenames.',
        isCorrect: false,
      },
      {
        text: 'Because they tend to hide unrelated logic and reduce clarity.',
        isCorrect: true,
      },
      { text: 'Because TypeScript does not allow them.', isCorrect: false },
      {
        text: 'Because they break dependency injection by default.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'What is a key benefit of lazy loading features in Angular architecture?',
    explanation:
      'Lazy loading reduces the initial JavaScript bundle size by loading feature code on demand, improving startup performance and helping keep architectural boundaries clean.',
    options: [
      {
        text: 'It forces the whole application to load at once.',
        isCorrect: false,
      },
      {
        text: 'It loads feature code on demand, improving initial load performance.',
        isCorrect: true,
      },
      { text: 'It disables routing to feature areas.', isCorrect: false },
      { text: 'It prevents services from being reused.', isCorrect: false },
    ],
  },
  {
    statement:
      'In a well-structured Angular app with an eager core and lazy features, which dependency direction is typically acceptable?',
    explanation:
      'A common architectural rule is: lazy features can depend on core/shared utilities, but core should not import feature-specific code—otherwise you risk pulling lazy code into the eager bundle and creating tight coupling.',
    options: [
      {
        text: 'Core imports feature services whenever it needs them.',
        isCorrect: false,
      },
      {
        text: 'Features can depend on core, but core should not depend on feature code.',
        isCorrect: true,
      },
      { text: 'Features must never depend on shared code.', isCorrect: false },
      {
        text: 'Core must depend on every feature to centralize logic.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      "What architectural problem can occur if an eager 'core' service imports and injects a service from a lazy feature?",
    explanation:
      'This often violates eager/lazy boundaries and can accidentally pull feature code into the eager bundle, hurting performance and increasing coupling.',
    options: [
      { text: 'It makes the feature even more isolated.', isCorrect: false },
      {
        text: 'It may pull lazy feature code into the eager bundle and increase coupling.',
        isCorrect: true,
      },
      {
        text: 'It automatically converts the app to server-side rendering.',
        isCorrect: false,
      },
      {
        text: 'It disables dependency injection for that service.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'Stand-alone components and APIs made NgModules optional. What changed architecturally at a high level?',
    explanation:
      'The main change is how you wire things (e.g., lazy-loading route configs/components instead of feature modules). The overall architectural thinking—feature boundaries, isolation, and maintainability—remains largely the same.',
    options: [
      {
        text: 'Nothing changed: Angular no longer supports feature separation.',
        isCorrect: false,
      },
      {
        text: 'The wiring approach changed, but high-level structure and boundaries remain similar.',
        isCorrect: true,
      },
      {
        text: 'Components stopped existing and were replaced by directives.',
        isCorrect: false,
      },
      {
        text: 'Dependency injection was removed from Angular.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'According to Angular style recommendations, where should most UI-related code live in a typical Angular project?',
    explanation:
      'Angular guidance recommends keeping the application UI code (TypeScript, templates, styles) under a src/ directory, separating it from scripts and configuration.',
    options: [
      {
        text: "Inside a root-level folder named 'appCode/' outside src/.",
        isCorrect: false,
      },
      { text: 'Inside the src/ directory.', isCorrect: true },
      {
        text: "Only inside a folder called 'components/' at the root.",
        isCorrect: false,
      },
      { text: 'In a single file next to package.json.', isCorrect: false },
    ],
  },
  {
    statement:
      'What is the recommended strategy when templates start containing complex logic?',
    explanation:
      'Templates should remain readable. When logic becomes complex, refactor it into the component class (or into computed/state helpers) instead of packing it into the template.',
    options: [
      {
        text: 'Keep adding more complex expressions to the template until it works.',
        isCorrect: false,
      },
      {
        text: 'Move complex logic out of the template into TypeScript code.',
        isCorrect: true,
      },
      { text: 'Put all template logic into CSS.', isCorrect: false },
      {
        text: 'Replace templates with direct DOM manipulation.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'Which statement best reflects the Single Responsibility Principle (SRP) in Angular architecture?',
    explanation:
      'SRP suggests each component/service should have one clear responsibility. This improves testability, readability, and maintainability.',
    options: [
      {
        text: 'A component should handle UI, data access, and global state to reduce files.',
        isCorrect: false,
      },
      {
        text: 'Each component/service should have a focused responsibility.',
        isCorrect: true,
      },
      {
        text: 'Services should contain UI rendering to centralize code.',
        isCorrect: false,
      },
      {
        text: 'Templates should contain business rules to avoid TypeScript.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'What is a common architectural mistake related to lazy loading in Angular applications?',
    explanation:
      'A common mistake is not lazy loading key features (including early/initial features), leading to large eager bundles and inconsistent structure that is harder to maintain.',
    options: [
      {
        text: 'Lazy loading every feature improves performance and architecture.',
        isCorrect: false,
      },
      {
        text: 'Forgetting to lazy load important features can bloat the eager bundle.',
        isCorrect: true,
      },
      { text: 'Lazy loading makes routing impossible.', isCorrect: false },
      {
        text: 'Lazy loading forces all code into the root component.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'Why is using multiple different routing-loading approaches across the same app often discouraged?',
    explanation:
      'Using many approaches increases cognitive load and inconsistency. Teams typically benefit from choosing a consistent approach (especially for lazy boundaries) and applying it across the codebase.',
    options: [
      {
        text: 'Because Angular only supports one routing approach.',
        isCorrect: false,
      },
      {
        text: 'Because inconsistency increases cognitive load and maintenance cost.',
        isCorrect: true,
      },
      {
        text: 'Because route configuration cannot be version-controlled.',
        isCorrect: false,
      },
      {
        text: 'Because standalone components cannot be routed.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'Angular’s style guidance suggests grouping closely related files together. What does this usually mean for components?',
    explanation:
      'Component files (TS + optional HTML + styles + spec) should live together in the same directory, which improves discoverability and supports feature-based organization.',
    options: [
      {
        text: 'Put all component templates into one global templates/ folder.',
        isCorrect: false,
      },
      {
        text: 'Keep a component’s TS/template/styles/tests together in the same folder.',
        isCorrect: true,
      },
      {
        text: 'Store all styles globally to avoid component folders.',
        isCorrect: false,
      },
      {
        text: 'Place tests in a single root-level tests/ folder only.',
        isCorrect: false,
      },
    ],
  },
  {
    statement:
      'Which Angular DI style is recommended in the modern Angular style guide for readability and type inference benefits?',
    explanation:
      'Angular’s style guide recommends preferring the inject() function over constructor parameter injection in many cases for readability and other advantages.',
    options: [
      {
        text: 'Always avoid DI and pass dependencies manually.',
        isCorrect: false,
      },
      {
        text: 'Prefer inject() in many cases over constructor parameter injection.',
        isCorrect: true,
      },
      {
        text: 'Use global singletons without DI to reduce code.',
        isCorrect: false,
      },
      {
        text: 'Use only decorators for DI and never functions.',
        isCorrect: false,
      },
    ],
  },
];
