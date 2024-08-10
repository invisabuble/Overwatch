#ifndef OVERWATCH_H
#define OVERWATCH_H

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <vector>
#include <Preferences.h>
#include <esp_system.h>

Preferences preferences;
using namespace websockets;

struct measurement {
  String name;
  int value;

  measurement(String name) : name(name) {}

  // Virtual method for polymorphism, this method is overwritten in each derived struct.
  virtual String measure(bool get_value = false) {
    return String(-1);
  }

  virtual void output (String output_value) {
    return;
  }

  // Virtual destructor for proper cleanup of derived classes
  virtual ~measurement() {}
};

struct digital_measurement : measurement {

  int gpio;
  bool button;

  digital_measurement(String name, bool button = false) : measurement(name), button(button) {
    gpio = name.substring(3).toInt();
    if (button) {
      pinMode(gpio, INPUT_PULLUP);
    } else {
      pinMode(gpio, OUTPUT);
      digitalWrite(gpio, LOW);
    }
    
  }

  String measure(bool get_value = false) override {

    int gpio_value = digitalRead(gpio);

    if ((gpio_value != value) || (get_value)) {
      value = gpio_value;
      if (button) {
        return String(!value);
      }
      return String(value);
    }

    return String(-1);
  
  }

};

struct analog_measurement : measurement {

  int step;
  int thresh;
  int gpio;
  unsigned long last_measure = 0;

  analog_measurement(String name, int step = 0, int thresh = 0)
    : measurement(name), step(step), thresh(thresh) {
    gpio = name.substring(3).toInt();
    pinMode(gpio, INPUT_PULLUP);
  }

  String measure(bool get_value = false) override {

    unsigned long current_time = millis();

    if ((current_time - last_measure > step) || (get_value)) {

      last_measure = current_time;
      int gpio_value = analogRead(gpio);

      if ((abs(value - gpio_value) > thresh) || (get_value)) {

        value = gpio_value;
        return String(value);
      
      }

    }

    return String(-1);

  }

};

struct reading : measurement {

  String value = "\"\"";
  String last_value = "";

  reading(String name) : measurement(name) {}

  void output(String output_value) {
    // Encapsulate the output value in quotation marks to avoid JSON errors.
    value = "\"" + output_value + "\"";
  
  }

  String measure(bool get_value = false) override {

    if ((last_value != value) || (get_value)) {

      last_value = value;
      return String(value);

    }

    return String(-1);
  
  }

};

class overwatch_device {

  private:
  
    int status_led;
    String UUID;
    String local_ip;

    String config;
    String ssl_cert;
    String SSID;
    String PSWD;
    String HOST;
    String PORT;

    WebsocketsClient client;
    WiFiClient espClient;

    StaticJsonDocument<1024> device_config;
    std::vector<measurement*> measurement_array;  // Store pointers to measurement

    unsigned long blink_time = 0;

  public:

    overwatch_device(int status_led = 12) : status_led(status_led) {

      Serial.println("Starting overwatch device...");

      pinMode(status_led, OUTPUT);
      digitalWrite(status_led, LOW);

      // RETRIEVE CONFIG, SSL, WIFI CREDS, OW HOST+PORT
      config = preferences_read_write("configuration", configuration);
      ssl_cert = preferences_read_write("ssl_cert", ssl_certificate);
      SSID = preferences_read_write("ssid", ssid);
      PSWD = preferences_read_write("pswd", pswd);
      HOST = preferences_read_write("host", host);
      PORT = preferences_read_write("port", port);

      Serial.println(config);

      // DESERIALIZE CONFIG
      deserializeJson(device_config, config);

      // SETUP DIGITAL INPUTS
      JsonArray DIGITAL_INPUTS = device_config["digital_inputs"].as<JsonArray>();
      for (JsonVariant DIGITAL_INPUT : DIGITAL_INPUTS) {
        pinMode(DIGITAL_INPUT.as<int>(), INPUT);
      }

      // SETUP DIGITAL MEASUREMENTS
      JsonObject DIGITAL_MEASUREMENTS = device_config["digital_measurements"].as<JsonObject>();
      for (JsonPair MEASUREMENT : DIGITAL_MEASUREMENTS) {

        String gpio_name = MEASUREMENT.key().c_str();

        // Check if the digital measurement is also a digital input
        String gpio = gpio_name.substring(3);

        Serial.printf("DM : %s\n", gpio_name.c_str());

        bool is_input = false;

        for (JsonVariant DIGITAL_INPUT : DIGITAL_INPUTS) {
            
            String digital_input = String(DIGITAL_INPUT.as<int>());

            if (digital_input == gpio) {
              is_input = true;
              Serial.printf("   DI : %s\n", gpio_name.c_str());
              break;
            } 

        }

        measurement_array.push_back(new digital_measurement(gpio_name, is_input));

      }

      // SETUP ANALOG MEASUREMENTS
      JsonObject ANALOG_MEASUREMENTS = device_config["analog_measurements"].as<JsonObject>();
      for (JsonPair MEASUREMENT : ANALOG_MEASUREMENTS) {
        JsonObject measure = MEASUREMENT.value().as<JsonObject>();
        String gpio_name = MEASUREMENT.key().c_str();
        int step = measure["step"].as<int>();
        int thresh = measure["thresh"].as<int>();
        measurement_array.push_back(new analog_measurement(gpio_name, step, thresh));
        Serial.printf("AM : %s\n", gpio_name.c_str());
      }

      // SETUP READINGS
      JsonArray READINGS = device_config["readings"].as<JsonArray>();
      for (JsonVariant READING : READINGS) {
        String reading_name = READING.as<String>();
        measurement_array.push_back(new reading(reading_name));
        Serial.printf("R: %s\n", reading_name.c_str());
      }

      // ========== CONNECT TO WIFI ========== //

      Serial.printf("Connecting to %s .", SSID);

      WiFi.begin(SSID,PSWD);

      while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.printf(".");
        digitalWrite(status_led, !digitalRead(status_led));
      }

      UUID = String("ow_") + WiFi.macAddress();
      IPAddress ip = WiFi.localIP();
      local_ip = ip.toString();

      Serial.printf("\nConnected to %s\nIP : ", SSID);
      Serial.println(WiFi.localIP());
      Serial.printf("MAC : ");
      Serial.println(UUID);

    }


    // Clean up memory to prevent leaks
    ~overwatch_device() {
      for (measurement* m : measurement_array) {
        delete m;
      }
    }


    void websocket_connect () {

      client.setCACert(ssl_cert.c_str());

      if (client.connect(String("wss://") + host + ":" + port)) {

        Serial.println("Connected to WebSocket server");
        wss_send_config();
        read_measurement_array(true);

      } else {
        Serial.println("Connection failed. Retrying...");
      }

      client.onMessage([&](WebsocketsMessage message) {
        wss_receive(message.data());
      });
    
    }


    void wss_send_config () {

      StaticJsonDocument<200> ESP_CONFIG;
      ESP_CONFIG["INFO"]["UUID"] = UUID;
      ESP_CONFIG["INFO"]["IP"] = local_ip;
      config.replace("\n", "");
      ESP_CONFIG["CONFIG"] = config;
      
      String espConfigString;
      serializeJson(ESP_CONFIG, espConfigString);

      client.send(espConfigString);

    }


    String stringify_json (JsonObject json_variable) {
      String variable;
      serializeJson(json_variable, variable);
      return variable;
    }


    void update_reading (String reading, String value) {
      
      // Itterate through the pointer array.
      for (measurement* MEASURE : measurement_array) {

        // Use -> to access the variables of the object
        String name = MEASURE->name;
        
        if (reading == name) {

          Serial.printf("Updating reading : ");
          Serial.println(name);
          Serial.println(value);

          MEASURE->output(value);

          return;

        }

      }

    }


    void wss_receive (String data) {
      Serial.println(data);

      StaticJsonDocument<200> instruction;
      deserializeJson(instruction, data);

      if (instruction["ping_network"] == "ping_network") {
        wss_send_config();
        read_measurement_array(true);
        return;
      }

      if (instruction["set_config"]) {
        Serial.println("SETTING NEW CONFIG : ");
        String new_config = stringify_json(instruction["set_config"]);
        Serial.println(new_config);
        preferences_read_write("configuration", new_config, true);
        ESP.restart();
        return;
      }

      int gpio = instruction["gpio"].as<int>();
      String target = instruction["target"].as<String>();

      if ( (target == UUID) ) {
        digitalWrite(gpio, !digitalRead(gpio));
      }

    }


    void read_measurement_array(bool get_values = false) {

      bool array_updated = false;
      String update_array = "{\"INFO\":{\"UUID\":\"" + String(UUID) + "\",\"IP\":\"" + String(local_ip) + "\",\"TYPE\":\"device\"},\"MEASUREMENTS\":[";

      // Itterate through the pointer array.
      for (measurement* MEASURE : measurement_array) {

        // Use -> to access the method of the object
        String value = MEASURE->measure(get_values);

        if (value != "-1") {
          array_updated = true;
          if (update_array.charAt(update_array.length() - 1) == '}') {
            update_array += ",";
          }

          String name = MEASURE->name;
          String measurement_state = "{\"" + name + "\":" + value + "}";
          update_array += measurement_state;

        }
      }

      update_array += "]}";

      if (array_updated) {
        Serial.println(update_array);
        client.send(update_array);
      }

    }


    void wipe_preferences() {
      preferences.clear();
      Serial.println("Wiped all preferences.");
    }


    String preferences_read_write(String variable_name, String variable = "", bool new_variable = false) {
      preferences.begin("overwatch", false);

      if (!preferences.isKey(variable_name.c_str())) {
        preferences.putString(variable_name.c_str(), variable.c_str());
        Serial.printf("Loaded new key '%s' into preferences.\n", variable_name.c_str());
      }

      if (new_variable) {
        preferences.putString(variable_name.c_str(), variable.c_str());
        Serial.printf("Loaded new variable into %s key.\n", variable_name.c_str());
      }

      String preferences_variable = preferences.getString(variable_name.c_str());
      //wipe_preferences();
      preferences.end();
      return preferences_variable;
    }


    void overwatch_loop() {

      unsigned long current_time = millis();

      // ========== LOOP FUNCTIONS ========== //
      read_measurement_array();
      // ==================================== //

      if (!client.available()) {
        Serial.println("Attempting websocket connection ...");
        delay(250);
        digitalWrite(status_led, !digitalRead(status_led));
        websocket_connect();
      } else {
        client.poll();
        if (current_time - blink_time >= 10000) {
          blink_time = current_time;
          digitalWrite(status_led, HIGH);
          delay(10);
          digitalWrite(status_led, LOW);
        }
      }
    }

};

#endif
