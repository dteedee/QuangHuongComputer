#!/bin/bash
# Load Testing Script using Apache JMeter
# This script performs performance testing on API endpoints

# Configuration
HOST="localhost"
PORT="5000"
THREADS=50
RAMP_TIME=30
DURATION=300
PROTOCOL="http"

echo "🚀 Starting API Load Test"
echo "Target: $PROTOCOL://$HOST:$PORT"
echo "Threads: $THREADS"
echo "Ramp Time: $RAMP_TIME seconds"
echo "Duration: $DURATION seconds"
echo ""

# Install JMeter if needed
if ! command -v jmeter &> /dev/null; then
    echo "📦 Installing Apache JMeter..."
    # For Windows with Chocolatey
    if command -v choco &> /dev/null; then
        choco install jmeter -y
    # For macOS with Homebrew
    elif command -v brew &> /dev/null; then
        brew install jmeter
    else
        echo "❌ Please install Apache JMeter manually from: https://jmeter.apache.org/"
        exit 1
    fi
fi

# Create JMeter Test Plan
cat > /tmp/load_test.jmx << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.5">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="API Load Test" enabled="true">
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
      <stringProp name="TestPlan.user_define_variables"></stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments">
          <elementProp name="BASE_URL" elementType="Argument">
            <stringProp name="Argument.name">BASE_URL</stringProp>
            <stringProp name="Argument.value">http://localhost:5000</stringProp>
            <stringProp name="Argument.metadata">=</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
      <stringProp name="TestPlan.comments"></stringProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="API Load Test Group" enabled="true">
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">1</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">50</stringProp>
        <stringProp name="ThreadGroup.ramp_time">30</stringProp>
        <longProp name="ThreadGroup.start_time">1704067200000</longProp>
        <longProp name="ThreadGroup.end_time">1704067200000</longProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <stringProp name="ThreadGroup.duration">300</stringProp>
        <stringProp name="ThreadGroup.delay"></stringProp>
        <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSampler guiclass="HttpTestSampleGui" testclass="HTTPSampler" testname="GET /api/catalog/products" enabled="true">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
            <collectionProp name="Arguments.arguments">
              <elementProp name="page" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.name">page</stringProp>
                <stringProp name="Argument.value">1</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
                <boolProp name="HTTPArgument.use_equals">true</boolProp>
              </elementProp>
              <elementProp name="pageSize" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.name">pageSize</stringProp>
                <stringProp name="Argument.value">20</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
                <boolProp name="HTTPArgument.use_equals">true</boolProp>
              </elementProp>
            </collectionProp>
          </elementProp>
          <stringProp name="HTTPSampler.domain">localhost</stringProp>
          <stringProp name="HTTPSampler.port">5000</stringProp>
          <stringProp name="HTTPSampler.protocol">http</stringProp>
          <stringProp name="HTTPSampler.contentEncoding"></stringProp>
          <stringProp name="HTTPSampler.path">/api/catalog/products</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
          <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
          <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
          <stringProp name="HTTPSampler.connect_timeout"></stringProp>
          <stringProp name="HTTPSampler.response_timeout"></stringProp>
        </HTTPSampler>
        <hashTree>
          <ResultCollector guiclass="TableVisualizer" testclass="ResultCollector" testname="View Results Table" enabled="true">
            <boolProp name="ResultCollector.error_logging">false</boolProp>
            <objProp>
              <name>samplers</name>
              <value class="java.util.ArrayList"/>
            </objProp>
            <stringProp name="filename"></stringProp>
          </ResultCollector>
          <hashTree/>
        </hashTree>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
EOF

echo "✅ Test plan created"
echo ""
echo "📊 Running JMeter test..."

# Run JMeter with the test plan
jmeter -n -t /tmp/load_test.jmx -l /tmp/results.jtl -j /tmp/jmeter.log -e -o /tmp/load_test_report

echo ""
echo "✅ Load test completed!"
echo "📈 Results saved to: /tmp/load_test_report"
echo ""
echo "📊 Summary:"
grep -i "aggregate report" /tmp/jmeter.log || echo "Check /tmp/load_test_report for results"
