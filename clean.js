var spawn = require('child_process').spawn

var cli = (program, args, next) => {
  var command = spawn(program, args)
  var stdout = ''
  var stderr = ''
  command.stdout.on('data', (data) => {
    stdout += data
  })

  command.stderr.on('data', (data) => {
    stderr += data
  })

  command.on('close', (code) => {
    next(code, stdout, stderr)
  })
}

// git push origin --delete branch_name

cli('git', ['branch', '-a'], (code, stdout, stderr) => {
  console.log(stdout)
})
