#include "config.h"
#include "overwatch.h"

overwatch_device* ow;

void setup() {

  Serial.begin(115200);

  ow = new overwatch_device();

}

void loop() {

  ow->overwatch_loop();

  // Update reading called esp_reading with a new string value
  // ow->update_reading("esp_test_reading", String(value));

}
