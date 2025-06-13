# AIccounting 测试说明

本目录包含 AIccounting 项目的自动化测试文件。

## 测试结构

测试文件按照被测试模块分类：

1. `test_sql.py` - 数据库操作模块测试
2. `test_api.py` - API接口和路由测试
3. `test_date_utils.py` - 日期处理工具函数测试
4. `test_main.py` - 基本测试框架验证
5. `locustfile.py` - 业务流程性能测试
6. `locustfile_extreme.py` - 极限性能测试

## 测试详细说明

### 1. 数据库操作测试 (`test_sql.py`)

这个文件测试与数据库交互的功能，包括连接、增删改查等操作。

| 测试方法 | 目的 | 说明 |
|---------|------|------|
| `test_connect` | 测试数据库连接功能 | 验证连接成功和失败的情况。当看到"数据库连接错误: 测试连接错误"时，这是测试代码故意模拟的错误场景，不是真正的错误。 |
| `test_add_entry` | 测试添加记账条目 | 验证能否正确插入新记录并返回ID。 |
| `test_get_entries` | 测试查询记账条目 | 测试无条件查询和带筛选条件查询，验证返回的数据结构是否正确。 |
| `test_update_entry` | 测试更新记账条目 | 验证能否正确更新现有记录。 |
| `test_delete_entry` | 测试删除记账条目 | 验证能否正确删除指定记录。 |

### 2. API接口测试 (`test_api.py`)

这个文件测试API功能和HTTP路由，分为两个测试类：`TestAPIFunctions`和`TestAPIRoutes`。

#### TestAPIFunctions - API功能函数测试

| 测试方法 | 目的 | 说明 |
|---------|------|------|
| `test_get_filtered_transaction_list_api` | 测试获取过滤后的交易列表 | 验证无筛选、日期筛选和类型筛选的功能。 |
| `test_get_summary_statistics_api` | 测试获取汇总统计数据 | 验证计算收入、支出、净收入和总流量的准确性。 |

#### TestAPIRoutes - API路由测试

| 测试方法 | 目的 | 说明 |
|---------|------|------|
| `test_get_transaction_list_for_frontend_route` | 测试获取前端交易列表路由 | 验证HTTP GET请求和参数传递是否正确，以及返回的JSON格式是否符合预期。 |
| `test_get_category_distribution_route` | 测试获取类别分布路由 | 验证HTTP POST请求到`/get_chart_data_from_filters`路由，测试类别分布数据的获取。 |

### 3. 日期处理工具测试 (`test_date_utils.py`)

这个文件测试日期处理相关的工具函数。

| 测试方法 | 目的 | 说明 |
|---------|------|------|
| `test_parse_date_optional` | 测试日期字符串解析函数 | 验证各种日期格式的解析结果，包括有效日期、无效日期和None输入。 |
| `test_get_time_range_from_period` | 测试从时间段获取日期范围 | 该测试当前被注释掉，因为涉及复杂的日期mock。测试各种时间段参数如"today"、"this_week"、"this_month"等的解析结果。 |

### 4. 基本测试框架验证 (`test_main.py`)

这个文件包含基本的测试，用于验证测试框架能正常工作。

| 测试方法 | 目的 | 说明 |
|---------|------|------|
| `test_true` | 最基本的测试 | 总是通过，用于验证测试框架正常工作。 |
| `test_python_version` | 测试Python版本信息 | 显示当前Python版本并验证是Python 3。 |

### 5. 业务流程性能测试 (`locustfile.py`)

这个文件使用 Locust 框架进行性能测试，模拟多个用户同时使用系统的各种功能，测试系统在一般负载下的响应能力和稳定性。主要特点是**模拟真实用户行为流程**，测试系统作为整体的性能表现。

#### AIAccountingUser - 用户行为模拟类

`AIAccountingUser` 类模拟真实用户在系统中的行为，包含以下几种用户操作流程：

| 测试流程 | 权重 | 说明 |
|---------|------|------|
| `record_expense_flow` | 4 | 记录支出流程：通过对话记录一笔支出，然后查看当天账单和支出图表。模拟用户记录日常消费的场景。 |
| `quick_query_flow` | 3 | 快速查询流程：选择一个时间段（今天、本周、本月）查询账单和统计数据。模拟用户快速查看财务状况的场景。 |
| `record_income_flow` | 2 | 记录收入流程：通过对话记录一笔收入，然后查看近一个月的账单和收入趋势。模拟用户记录工资、奖金等收入的场景。 |
| `analysis_flow` | 1 | 深度分析流程：查看过去三个月的账单，分析特定类别的支出分布，查看长期收支趋势，向AI助手询问财务建议。模拟用户深入分析财务状况的场景。 |

每个流程都包含多个API调用，模拟完整的用户操作路径，测试系统各组件在连续操作下的性能和可靠性。

### 6. 极限性能测试 (`locustfile_extreme.py`)

这个文件使用 Locust 框架进行**极限压力测试**，专注于单个API接口的高并发、大用户量测试，用于发现系统的性能瓶颈和确定最大承载能力。每个用户类只测试一个特定的接口，以获得最纯粹的性能数据。

#### 三种极限测试用户类型

| 用户类型 | 目标接口 | 说明 |
|---------|----------|------|
| `ExtremeChatApiUser` | `/api/chat` | 极限测试对话记账API，模拟大量用户同时发送记账消息，测试AI处理和数据库写入的极限性能。 |
| `ExtremeQueryApiUser` | `/get_transaction_list_for_frontend` | 极限测试查询API，模拟大量用户同时查询交易列表，测试数据库读取和数据处理的极限性能。 |
| `ExtremeChartApiUser` | `/get_chart_data_from_filters` | 极限测试图表数据API，模拟大量用户同时获取分析图表，测试复杂数据聚合和处理的极限性能。 |

该测试设置了极短的用户思考时间（0.01-0.05秒），并建议使用大量用户（1000-5000）和高速出生率（100-500/秒）来发现系统的性能极限。可以使用`--class-picker`选项专门测试某一类API。

## 运行测试

### 运行所有单元测试

```bash
cd AIccounting-main
python tests/run_tests.py
```

### 运行单个测试文件

```bash
python -m unittest tests/test_sql.py
```

### 运行特定测试方法

```bash
python -m unittest tests.test_sql.TestMySQLDataStore.test_connect
```

### 运行业务流程性能测试

```bash
cd AIccounting-main
# 安装Locust (如果还没安装)
pip install locust
# 运行业务流程测试
locust -f tests/locustfile.py --host=http://127.0.0.1:5000
```

### 运行极限性能测试

```bash
cd AIccounting-main
# 运行极限性能测试
locust -f tests/locustfile_extreme.py --host=http://127.0.0.1:5000 --class-picker
```

然后在浏览器中打开 http://localhost:8089，设置用户数、每秒启动速率，并启动测试。

### 使用命令行直接选择特定测试类

如果想要直接从命令行选择特定的测试类，可以使用以下命令：

#### 1. 测试对话记账API (ExtremeChatApiUser)

```bash
# 方式一：使用class-picker手动选择
locust -f tests/locustfile_extreme.py --host=http://127.0.0.1:5000 --class-picker ExtremeChatApiUser

# 方式二：直接运行无需Web界面 (适合自动化测试)
locust -f tests/locustfile_extreme.py --host=http://127.0.0.1:5000 -u 1000 -r 100 -t 5m --headless --only-summary --user-classes ExtremeChatApiUser
```

#### 2. 测试查询交易API (ExtremeQueryApiUser)

```bash
# 方式一：使用class-picker手动选择
locust -f tests/locustfile_extreme.py --host=http://127.0.0.1:5000 --class-picker ExtremeQueryApiUser

# 方式二：直接运行无需Web界面 (适合自动化测试)
locust -f tests/locustfile_extreme.py --host=http://127.0.0.1:5000 -u 1000 -r 100 -t 5m --headless --only-summary --user-classes ExtremeQueryApiUser
```

#### 3. 测试图表数据API (ExtremeChartApiUser)

```bash
# 方式一：使用class-picker手动选择
locust -f tests/locustfile_extreme.py --host=http://127.0.0.1:5000 --class-picker ExtremeChartApiUser

# 方式二：直接运行无需Web界面 (适合自动化测试)
locust -f tests/locustfile_extreme.py --host=http://127.0.0.1:5000 -u 1000 -r 100 -t 5m --headless --only-summary --user-classes ExtremeChartApiUser
```

参数说明：
- `-u 1000`: 模拟1000个用户
- `-r 100`: 每秒增加100个用户
- `-t 5m`: 测试运行5分钟
- `--headless`: 不启动Web界面
- `--only-summary`: 仅显示摘要报告
- `--user-classes`: 指定要运行的用户类

您可以根据需要调整用户数量(-u)、增长速率(-r)和测试时间(-t)参数。

## 测试设计说明

1. **单元测试**：使用 `unittest` 框架测试独立功能和模块
2. **数据库测试**：使用 `unittest.mock` 模拟数据库连接，避免实际连接数据库
3. **API测试**：使用 Flask 测试客户端发送模拟请求
4. **日期工具测试**：针对不同的日期格式和时间段参数进行测试
5. **业务流程性能测试**：使用 Locust 模拟真实用户行为，测试系统在正常负载下的性能
6. **极限性能测试**：针对单个API进行高并发测试，发现系统瓶颈和最大承载能力

## 测试依赖

运行测试需要安装以下依赖：

```bash
pip install pytest flask pymysql locust
```

## 注意事项

1. 测试运行时会自动添加项目根目录到 Python 路径
2. 测试使用模拟(mock)对象替代实际的外部依赖（如数据库）
3. 如果修改了被测试函数的行为，请相应更新测试用例
4. 测试中出现的错误信息（如"数据库连接错误: 测试连接错误"）是故意模拟的错误场景，不是真正的错误
5. 性能测试需要先启动后端服务，确保API接口可用
6. 对于极限性能测试，建议先使用较小的用户数进行测试，然后逐步增加用户数和速率
7. 业务流程测试适合评估真实用户体验，极限性能测试适合发现系统瓶颈

## 测试不足与改进建议

经过审查，当前测试框架存在以下不足：

### 1. AI对话记账功能缺乏完整测试

当前测试主要关注性能和基础组件，但缺少对核心AI记账功能的全面测试：

- **未测试AI理解能力**：没有验证`AIAccountant.process_user_message`方法是否能正确理解各种表达方式的记账意图
- **缺少API功能测试**：没有针对`/api/chat`接口的单元测试或功能测试
- **未验证端到端流程**：缺少从用户输入到数据库写入再到查询验证的完整测试流程

### 2. 现有Locust性能测试的局限性

当前性能测试主要关注接口可用性和并发处理能力：

- 仅验证HTTP状态码成功（200），未检查响应内容
- 发送请求后不验证数据是否成功写入数据库
- 无法评估AI理解和处理的质量和准确性

### 3. 改进建议

为提高测试覆盖率和质量，建议增加以下测试：

1. **创建`test_chat.py`文件**：
   - 测试`AIAccountant`类的各种功能
   - 使用预设的用户消息测试理解能力
   - 验证不同表达方式的记账能力

2. **增强`test_api.py`**：
   - 添加对`/api/chat`路由的测试
   - 验证请求处理和响应格式

3. **完善端到端测试**：
   - 设计测试用例验证从用户消息到数据库查询的完整流程
   - 检验消息发送后记录是否成功存储

4. **增强性能测试**：
   - 添加响应内容验证
   - 实现请求后查询验证记录是否写入
   - 分析AI回复质量的指标 