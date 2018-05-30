# 五子棋在线版  
底层通过socket传输数据, 目前google浏览器不支持直接运行, 火狐浏览器可以, 如果没有火狐浏览器, 请将此项目放到apache、tomcat等web容器中方能正常运行.  
  server.js是服务器文件
  game.html是客户端的入口文件
    * gobang-ui.html 是玩家下棋页面
    * index.html 是用户登陆界面
    * home.html 是用户大厅界面, 用来匹配等待的, 如果在线人数少于2人, 则匹配失败, 并会返回错误信息
