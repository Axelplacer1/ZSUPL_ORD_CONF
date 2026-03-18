import Controller from "sap/ui/core/mvc/Controller";
import BaseController from "./Base.controller";
import UIComponent from "sap/ui/core/UIComponent";
import Event from "sap/ui/base/Event";
import Router from "sap/f/routing/Router";
import Route, { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import MessageBox from "sap/m/MessageBox";
import { Button$PressEvent } from "sap/m/Button";
import JSONModel from "sap/ui/model/json/JSONModel";
import Dialog from "sap/m/Dialog";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";

/**
 * @namespace au.com.iesol.po.confirmation.variancewftask.controller
 */
export default class MainView extends BaseController {

    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {
       
        ((this as Controller).getOwnerComponent() as UIComponent).getRouter().getRoute("RouteMainView")?.attachPatternMatched({}, this.loadConfirmationDetails, this);
        // /mainRoute_detail - from MyInbox route
        ((this as Controller).getOwnerComponent() as UIComponent).getRouter().getRoute("mainRoute_detail")?.attachPatternMatched({}, this.loadConfirmationDetails2, this);
    }

    public loadConfirmationDetails(oEvent: Route$PatternMatchedEvent) {

        if (!oEvent.getParameter("arguments")) {
            return;
        }
        this.getView()?.setBusy(true);
        let sConfId = (oEvent.getParameter("arguments") as any).id;
        var that = this as Controller
        (this.getView()?.getModel() as ODataModel).read("/xIESOLxC_SUPL_CONF_OBJ('" + sConfId + "')", {
            success: function (oData: any) {

                that.getView()?.bindObject({
                    path: "/xIESOLxC_SUPL_CONFIRMATION(ConfirmationID='" + oData.ConfirmationID + "',Counter='" + oData.Counter + "',PurchaseOrderItem='" + oData.PurchaseOrderItem + "',PurchaseOrder='" + oData.PurchaseOrder + "')"
                    ,events: {
                        "dataReceived": function (oData: any) {
                            that.getView()?.setBusy(false);
                        }.bind(that)
                    }
                });
            }.bind(this),
            error: function (oResp: any) {

            }.bind(this)
        });
    }
    public loadConfirmationDetails2(oEvent: Route$PatternMatchedEvent) {

        if (!oEvent.getParameter("arguments") || !(oEvent.getParameter("arguments") as any).InstanceID) {
            return;
        }
        let sConfId = (oEvent.getParameter("arguments") as any).InstanceID;
        var that = this as Controller;
        (that.getView()?.getModel() as ODataModel).read("/xIESOLxC_SUPL_CONF_OBJ('" + sConfId + "')", {
            success: function (oData: any) {

               
                that.getView()?.bindObject({
                    path: "/xIESOLxC_SUPL_CONFIRMATION(ConfirmationID='" + oData.ConfirmationID + "',Counter='" + oData.Counter + "',PurchaseOrderItem='" + oData.PurchaseOrderItem + "',PurchaseOrder='" + oData.PurchaseOrder + "')"
                });
            }.bind(this),
            error: function (oResp: any) {

            }.bind(this)
        });
    }
    public checkObjectExists() {
        var that = this as Controller;
        var oVariance = that.getView()?.getBindingContext()?.getObject();
        if (!oVariance || !oVariance.ConfirmationId || !oVariance.Ponumber || !oVariance.Poitem || !oVariance.Counter) {
            MessageBox.show("Confirmation data not available for action", {
                title: "Action confirmation"
            });
            return false;
        }
        return true;
    }
    public onVarianceApprove(oEvent: Button$PressEvent) {
        var that = this as Controller;
        var oVariance = that.getView()?.getBindingContext()?.getObject();
        if (this.checkObjectExists()) {
            this.actionConfirmation(oVariance, "ACCEPT", "");
        }

    }
    public onVarianceReject(oEvent: Button$PressEvent) {

        if (!this.checkObjectExists()) {
            return;
        }
        let oTempModel = this.getModel("tempModel") as JSONModel;
        //Display dialog for rejection reasons
        oTempModel.setProperty("/rejectionReason", "");
        oTempModel.setProperty("/messages", []);
        let sId = this.getView()?.getId();
        let oDialog = sap.ui.xmlfragment(sId ? sId : "", "iesol.supplier.confirm.action.fragments.RejectionReasonsDialog", this) as Dialog;
        this.getView()?.addDependent(oDialog);
        oDialog.open();
    }
    public RejectVarianceContinue(oEvent: Button$PressEvent) {

        let oBundle = this.getModel("i18n").getResourceBundle();
        let oTempModel = this.getModel("tempModel");
        if (!oTempModel.getProperty("/rejectionReason") || oTempModel.getProperty("/rejectionReason").trim().length === 0) {
            let sText = oBundle.getText("REJECTION_REASON_MANDATORY");
            MessageBox.error(sText, {
                title: oBundle.getText("appTitle")
            });
            return;
        }
        this.onDialogClose(oEvent);
        var oVariance = this.getView()?.getBindingContext()?.getObject();
        this.actionConfirmation(oVariance, "REJECT", oTempModel.getProperty("/rejectionReason").trim());

    }
    public onResolvedExternally(oEvent: Button$PressEvent) {
        var oVariance = this.getView()?.getBindingContext()?.getObject();
        if (!this.checkObjectExists()) {
            return;
        }
        this.getModel("tempModel").setProperty("/messages", []);
        this.actionConfirmation(oVariance, "RESOLVED", "");

    }
    public onDeletePOItem(oEvent: Button$PressEvent) {
        var oVariance = this.getView()?.getBindingContext()?.getObject();
        if (!this.checkObjectExists()) {
            return;
        }
        this.getModel("tempModel").setProperty("/messages", []);
        this.actionConfirmation(oVariance, "DELPOITEM", "");
    }
    public actionConfirmation(oVariance: any, sAction: string, sReasons: string): void {
        let that = this as Controller;
        let oModel = this.getModel("") as ODataModel;
        let oTempModel = this.getModel("tempModel") as JSONModel;
        let oParameters = {
            "ConfirmationID": oVariance.ConfirmationID,
            "PurchaseOrder": oVariance.PurchaseOrder,
            "PurchaseOrderItem": oVariance.PurchaseOrderItem,
            "Counter": oVariance.Counter,
            "Action": sAction,
            "RejectionReason": sReasons ? sReasons : ""
        }
        let sRAPAction: string = "";
        switch (sAction) {

            case "ACCEPT":
                sRAPAction = "/Accept";
                break;
            case "REJECT":
                sRAPAction = "/Reject";
                break;
            case "DELPOITEM":
                sRAPAction = "/DeletePurchaseOrderItem";
                break;
            case "RESOLVED":
                sRAPAction = "/Resolved";
                break;
            default:
                return;

        }
        that.getView()?.setBusy(true);

        oModel.callFunction(sRAPAction, {
            "urlParameters": oParameters,
            "method": "POST",
            success: function (oResp: any) {
                that.getView()?.setBusy(false);
                let aMessages = oTempModel.getProperty("/messages") || [];
                let oBundle = (that.getView()?.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
                let sText = oBundle.getText("PROCESSED_SUCCESSFULLY", [oVariance.PurchaseOrder + "/" + oVariance.PurchaseOrderItem]);
                if (oResp && Array.isArray(oResp.results) && oResp.results.length > 0) {
                    oResp.results.forEach(function (oMsg: any) {
                        aMessages.splice(0, 0, {
                            "purchaseOrder": oVariance.PurchaseOrder + "/" + oVariance.PurchaseOrderItem,
                            "type": oMsg.Type === 'E' ? "Error" :
                                oMsg.Type === 'W' ? "Warning" :
                                    oMsg.Type === 'S' ? "Success" : "Information",
                            "title": oMsg.MessageText, "description": oMsg.MessageText,
                            "icon": oMsg.Type === 'S' ? "sap-icon://message-success" :
                                oMsg.Type === 'E' ? "sap-icon://message-error" :
                                    oMsg.Type === 'W' ? "sap-icon://message-warning" : "sap-icon://message-information"
                        });
                    });

                } else {
                    aMessages.splice(0, 0, {
                        "purchaseOrder": oVariance.PurchaseOrder + "/" + oVariance.PurchaseOrderItem,
                        "type": "Success", "title": sText, "description": sText,
                        "icon": "sap-icon://message-success"
                    });
                }
                oTempModel.setProperty("/messages", aMessages);
                (that as BaseController).showModelErrors(true);
                (that.getOwnerComponent()?.getComponentData() as any).onTaskUpdate();
            }.bind(this),
            error: function () {
                that.getView()?.setBusy(false);
                (that as BaseController).showModelErrors(false);
            }.bind(this)
        });

    }
}