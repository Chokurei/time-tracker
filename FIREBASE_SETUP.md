# Firebase配置指南

## 🚨 权限被拒绝问题解决方案

你遇到的 `"Missing or insufficient permissions"` 错误是因为Firestore安全规则配置不正确。请按照以下步骤解决：

## 步骤1：访问Firebase控制台

1. 打开 [Firebase控制台](https://console.firebase.google.com/)
2. 选择你的项目：`tracker-dc404`

## 步骤2：配置Firestore安全规则

1. 在左侧菜单中点击 **"Firestore Database"**
2. 点击 **"规则"** 标签页
3. 将现有规则替换为以下内容：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 时间记录集合的安全规则
    match /timeRecords/{document} {
      // 允许已认证用户读取和写入自己的记录
      allow read, write: if request.auth != null && 
                        request.auth.uid == resource.data.userId;
      
      // 允许已认证用户创建新记录（当记录包含正确的userId时）
      allow create: if request.auth != null && 
                   request.auth.uid == request.resource.data.userId;
    }
    
    // 用户配置集合的安全规则
    match /userSettings/{userId} {
      // 只允许用户访问自己的设置
      allow read, write: if request.auth != null && 
                        request.auth.uid == userId;
    }
    
    // 用户统计数据集合的安全规则
    match /userStats/{userId} {
      // 只允许用户访问自己的统计数据
      allow read, write: if request.auth != null && 
                        request.auth.uid == userId;
    }
    
    // 默认拒绝所有其他访问
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. 点击 **"发布"** 按钮保存规则

## 步骤3：启用身份验证

1. 在左侧菜单中点击 **"Authentication"**
2. 点击 **"开始使用"**（如果还没有启用）
3. 在 **"Sign-in method"** 标签页中：
   - 启用 **"电子邮件地址/密码"** 登录方式
   - 点击 **"保存"**

## 步骤4：验证Firestore数据库

1. 在左侧菜单中点击 **"Firestore Database"**
2. 如果还没有创建数据库，点击 **"创建数据库"**
3. 选择 **"以测试模式启动"**（稍后我们会应用安全规则）
4. 选择数据库位置（建议选择离你最近的区域）

## 步骤5：测试修复结果

完成上述配置后：

1. 刷新你的应用页面
2. 登录你的账户
3. 使用右上角的 **"🔧 Firebase调试工具"**
4. 点击 **"运行测试"** 验证权限问题是否解决

## 常见问题

### Q: 为什么会出现权限被拒绝的错误？
A: 这通常是因为：
- Firestore安全规则过于严格或配置错误
- 用户未正确认证
- 数据结构与安全规则不匹配

### Q: 安全规则的工作原理是什么？
A: 我们的安全规则确保：
- 只有已登录的用户才能访问数据
- 用户只能访问自己的数据（通过userId字段验证）
- 防止未授权的数据访问

### Q: 如何验证规则是否正确？
A: 在Firebase控制台的规则页面，你可以使用 **"规则模拟器"** 来测试不同的访问场景。

## 需要帮助？

如果按照上述步骤操作后仍有问题，请检查：
1. Firebase项目ID是否正确
2. 用户是否已成功登录
3. 浏览器控制台是否有其他错误信息

完成配置后，你的云端同步功能应该就能正常工作了！