// Sardonic completion stories - Customer-facing, engaging, exciting, 200 words or less

interface StoryTemplate {
  intro: string[];
  middle: string[];
  outro: string[];
}

const storyTemplates: StoryTemplate = {
  intro: [
    "Against all odds and several cups of coffee,",
    "After what felt like an eternity of productivity,",
    "Through sheer determination (and perhaps spite),",
    "Defying the laws of procrastination,",
    "In a stunning display of competence,",
    "After battling countless distractions,",
    "Through the fog of meetings and interruptions,",
    "Despite the universe's best efforts to intervene,",
    "After a heroic struggle with scope creep,",
    "Emerging victorious from the depths of the backlog,",
    "Like a phoenix rising from the ashes of technical debt,",
    "After consulting the ancient scrolls (Stack Overflow),",
    "Powered by determination and questionable snacks,",
    "After wrestling with dependencies and winning,",
    "Through a maze of requirements and revisions,",
  ],
  middle: [
    "this task has been conquered.",
    "the impossible has become possible.",
    "another mountain has been climbed.",
    "victory has been achieved.",
    "the finish line has been crossed.",
    "success has been snatched from the jaws of defeat.",
    "the battle has been won.",
    "this item has been vanquished from the to-do list.",
    "progress has been made manifest.",
    "the deed is done.",
    "completion has been achieved.",
    "this challenge has met its match.",
    "the task has surrendered.",
    "triumph has been secured.",
    "the work is complete.",
  ],
  outro: [
    "The backlog weeps tears of joy.",
    "Your project manager sheds a single, proud tear.",
    "Somewhere, a sprint velocity chart smiles.",
    "The kanban board breathes a sigh of relief.",
    "Future you sends grateful thoughts.",
    "The burndown chart approves this message.",
    "Take a bow - you've earned it.",
    "Time to celebrate... or start the next one.",
    "Achievement unlocked. Satisfaction guaranteed.",
    "Mark this moment. Savor the victory.",
    "The project timeline thanks you for your service.",
    "One small step for the task, one giant leap for the project.",
    "May your next task be equally swift.",
    "Another checkbox, another triumph.",
    "On to the next adventure!",
  ],
};

const taskTypeStories: Record<string, string[]> = {
  Bug: [
    "The bug has been squashed, debugged, and shown the exit. Your code is cleaner, your conscience lighter.",
    "After hunting through the wilderness of edge cases, the bug has been captured and eliminated. The codebase is safe once more.",
    "What started as a mysterious malfunction ends in triumph. The bug is vanquished, the tests are green, and order is restored.",
    "Like a digital detective, you tracked down the culprit and delivered justice. The bug now resides in version control history.",
    "The hunt is over. The bug met its end in a perfectly crafted fix. Production thanks you for your vigilance.",
  ],
  Story: [
    "A new chapter has been written in your product's saga. This user story now lives happily in production.",
    "From requirement to reality, this story has completed its journey. The users will never know the effort, but you will.",
    "Once upon a time, there was a feature request. Now it's a feature. The end.",
    "This story has graduated from 'nice to have' to 'actually have.' Congratulations are in order.",
    "The narrative arc of this story ends in success. Users everywhere rejoice (they just don't know it yet).",
  ],
  Task: [
    "Task complete. Simple, elegant, done. Not everything needs to be dramatic, but we celebrate anyway.",
    "Another task bites the dust. Your productivity knows no bounds. Keep this momentum going.",
    "The task has been tamed. What once loomed on the horizon is now firmly in the past.",
    "Checked off, wrapped up, put to bed. This task won't be bothering anyone anymore.",
    "From pending to done in record time. If tasks could talk, this one would thank you.",
  ],
  'Sub-task': [
    "A small piece of a larger puzzle finds its place. Every completed sub-task brings the bigger picture into focus.",
    "Though small in scope, this sub-task played its part perfectly. The parent task tips its hat.",
    "One more piece of the puzzle clicks into place. The mosaic of progress continues to take shape.",
    "Sub-task subdued. The parent task grows stronger with every completed child.",
    "Little by little, great things are achieved. This sub-task is proof.",
  ],
};

/**
 * Generates a sardonic, engaging completion story for a task
 * @param taskName - The name/summary of the completed task
 * @param taskType - The type of task (Bug, Story, Task, etc.)
 * @returns A short, engaging story about the task completion
 */
export function generateCompletionStory(taskName: string, taskType?: string): string {
  // First, try to use a type-specific story
  if (taskType && taskTypeStories[taskType]) {
    const stories = taskTypeStories[taskType];
    const randomStory = stories[Math.floor(Math.random() * stories.length)];
    return randomStory;
  }

  // Fall back to templated story generation
  const intro = storyTemplates.intro[Math.floor(Math.random() * storyTemplates.intro.length)];
  const middle = storyTemplates.middle[Math.floor(Math.random() * storyTemplates.middle.length)];
  const outro = storyTemplates.outro[Math.floor(Math.random() * storyTemplates.outro.length)];

  return `${intro} ${middle} ${outro}`;
}

/**
 * Collection of headline-style completion messages
 */
export const completionHeadlines = [
  "Mission Accomplished!",
  "Victory is Yours!",
  "Task Terminated!",
  "Done and Dusted!",
  "Another One Bites the Dust!",
  "Crushed It!",
  "Nailed It!",
  "Achievement Unlocked!",
  "Success Achieved!",
  "Quest Complete!",
  "Target Eliminated!",
  "Case Closed!",
];

/**
 * Gets a random completion headline
 */
export function getCompletionHeadline(): string {
  return completionHeadlines[Math.floor(Math.random() * completionHeadlines.length)];
}
