const {formatStackTrace} = require('jest-message-util')
const path = require('path')
const chokidar = require('chokidar')
const chalk = require('chalk')
const {sync: globSync} = require('glob')

let lastFileRun = null

const cwd = path.join(__dirname, '../src')
const [_process, _script, arg] = process.argv
const watcher = watchFiles()
clearConsole()
sayWatching()
sayCommands()
listenForInput()
if (arg) {
  runMatchingQuiz(arg)
}

function watchFiles() {
  return chokidar
    .watch('**/quiz.js', {cwd, ignoreInitial: true})
    .on('change', relativePath => {
      rerunFile(relativePath)
    })
}

function listenForInput() {
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', text => {
    /* eslint complexity:0 */
    const input = text.trim()

    switch (input) {
      case 'clear':
      case 'c':
        clearConsole()
        sayWatching()
        break
      case 'quit':
      case 'q':
        watcher.close()
        process.stdin.pause()
        break
      case '':
        if (lastFileRun) {
          rerunFile(lastFileRun)
        } else {
          console.log(
            chalk.gray(
              'No quiz file has been run yet. Enter a glob pattern or change a file first.',
            ),
          )
        }
        break
      default:
        runMatchingQuiz(input)
    }
  })
}

function runMatchingQuiz(input) {
  const [relativePathOfFirstMatchingFile] = globSync(`*${input}*/quiz.js`, {
    cwd,
  })
  rerunFile(relativePathOfFirstMatchingFile)
}

function rerunFile(relativePath) {
  lastFileRun = relativePath
  const fullPath = path.resolve(cwd, relativePath)
  console.log('\n\n\n')
  console.log(chalk.gray(relativePath))

  try {
    delete require.cache[fullPath]
    require(fullPath) // eslint-disable-line global-require
  } catch (e) {
    console.log(
      getRelevantStackTrace(
        formatStackTrace(
          e.stack,
          {rootDir: cwd},
          {noStackTrace: false},
          fullPath,
        ),
      ),
    )
  }
}

function clearConsole() {
  console.log('\x1Bc')
}

function sayWatching() {
  console.log(chalk.gray('watching for a quiz change'))
}

function sayCommands() {
  console.log(
    chalk.gray(`You can enter a few handy commands here:
    q, quit     Quit the quizzes
    c, clear    Clear the console
    filename    Run the first file that matches your pattern
    <enter>     Re-run the last run file\n`),
  )
}

function getRelevantStackTrace(stack) {
  const splitStack = stack.split('\n')
  const newStack = [splitStack[0]] // start with the first line which is the error message
  for (let i = 1; i < splitStack.length; i++) {
    const line = splitStack[i]
    const isCodeFrame = line.includes('|')
    // if it starts with a number then it's part of a code frame and we want that.
    if (!line.includes('node_modules') || isCodeFrame) {
      newStack.push(isCodeFrame ? line : chalk.red(line))
    } else {
      break
    }
  }
  return newStack.join('\n')
}

/* eslint no-case-declarations:0, import/no-extraneous-dependencies:0 */
