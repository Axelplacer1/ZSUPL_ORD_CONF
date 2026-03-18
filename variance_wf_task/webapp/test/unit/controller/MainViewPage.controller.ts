/*global QUnit*/
import Controller from "au/com/iesol/po/confirmation/variancewftask/controller/MainView.controller";

QUnit.module("MainView Controller");

QUnit.test("I should test the MainView controller", function (assert: Assert) {
	const oAppController = new Controller("MainView");
	oAppController.onInit();
	assert.ok(oAppController);
});