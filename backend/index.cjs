// 后端服务入口文件
// 使用这个JavaScript文件来启动TypeScript服务器，避免直接使用ts-node的问题

// 注册ts-node来处理TypeScript文件
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS'
  }
});

// 导入并运行TypeScript服务器文件
require('./server.ts');