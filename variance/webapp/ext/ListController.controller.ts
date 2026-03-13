import ResourceBundle from "sap/base/i18n/ResourceBundle";
import DynamicPage from "sap/f/DynamicPage";
import Dialog from "sap/m/Dialog";
import MessageBox from "sap/m/MessageBox";
import Page from "sap/m/Page";

import Event from "sap/ui/base/Event";
import SmartFilterBar from "sap/ui/comp/smartfilterbar/SmartFilterBar";
import Control from "sap/ui/core/Control";

import JSONModel from "sap/ui/model/json/JSONModel";
import Model from "sap/ui/model/Model";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import Table from "sap/ui/table/Table";
import URLParsing from "sap/ushell/services/URLParsing";
//import TablePointerExtension from "sap/ui/table/Table";
//import Pointer from "sap/ui/table/extensions";

/**
 * @namespace au.com.iesol.po.confirmation.variance.ext
 */
export default {

    /**
     * name
     */
    onAfterRendering: function () {
        //  this.extensionAPI.attachPageDataLoaded(this.onPageDataLoaded.bind(this));
        //au.com.iesol.po.confirmation.variance::sap.suite.ui.generic.template.ListReport.view.ListReport::xIESOLxC_SUPL_CONFIRMATION--idAccept
        var that = this as any;
        that.byId("idButtonAccept").setType("Accept");
        that.byId("idButtonReject").setType("Reject");
        that.byId("idButtonDeletePOItem").setType("Reject");
        var sConfirmations = this.getTableId();
        if (that.byId(sConfirmations)) {
            that.byId(sConfirmations).getTable().attachBusyStateChanged(null, that.adjustColumnWidths, that);
        }
    }
    , onInitSmartFilterBarExtension: function (oEvent:Event) {
        var that = this as any;    
        var oFilterBar = oEvent.getSource() as SmartFilterBar;
        var oURLParsing = sap.ushell.Container.getService("URLParsing") as URLParsing;
        //console.log(oURLParsing);
        var oParameters:any = oURLParsing.parseParameters(that.getOwnerComponent().getRouter().getHashChanger().getHash());
        if (oParameters.po && oParameters.po.length > 0 && oParameters.po[0] && oParameters.po[0].length > 0) {
            //var oFilterBar = sap.ui.getCore().byId("vendor.orderconfirmations::sap.suite.ui.generic.template.ListReport.view.ListReport::AcknowledgementSet--listReportFilter");
            var oFData :any = {};
            if (oFilterBar.isInitialised()) {
                oFData = oFilterBar.getFilterData() || {};
            } else {
                oFData.ConfirmationStatus = { "items": [{ "key": "READY", "text": "Ready for processing" }] };
            }
            oFData.PurchaseOrder = { "ranges": [{ "exclude": false, operation: 'EQ', value1: oParameters.po[0], "keyField": "PurchaseOrder", "tokenText": '"=' + oParameters.po[0] + '"' }] };
            oFilterBar.setFilterData(oFData, true);

        }
    },
    getSelectedContexts(oEvent: Event): object {
        var that = this as any;
        //let oTable = oEvent.getSource().getParent().getParent().getTable();//Button-->toolbar-->Table-->Grid table
        let aIndices = that.extensionAPI.getSelectedContexts();
        let oBundle = that.getModel("i18n").getResourceBundle();

        if (aIndices.length === 0) {
            let sText = oBundle.getText("ROWS_NOT_SELECTED");
            MessageBox.error(sText, {
                title: oBundle.getText("appTitle")
            });
            return {};
        }
        return { "aIndices": aIndices };
    },
    onAfterOpeningActionDialog(oEvent: Event) {
        let oDialog = oEvent.getSource();
        let oAcceptance = (oDialog as Dialog).data("acceptance");
        let oTempModel = this.getModel("tempModel") as JSONModel;
        oTempModel.setProperty("/messages", []);
        oTempModel.setProperty("/cancelled", false);
        this.actionConfirmation(oAcceptance.indices, 0, oAcceptance.action, oTempModel.getProperty("/rejectionReason"));
    }
    , onVarianceAccept(oEvent: Event) {
        var that = this as any;
        var oSelected: any = this.getSelectedContexts(oEvent);
        if (!oSelected) { return; }
        (this.getModel("tempModel") as JSONModel).setProperty("/messages", []);
        if (oSelected.aIndices && oSelected.aIndices.length > 1) {
            //Call this migrate in foregroud with progress bar in a dialog
            let oBundle = (this.getModel("i18n") as ResourceModel).getResourceBundle();
            let oDialog = sap.ui.xmlfragment(that.getView().getId(), "au.com.iesol.po.confirmation.variance.fragments.ActionDialog", this) as Dialog;
            oDialog.data("acceptance", { "indices": oSelected.aIndices, "action": "ACCEPT" });
            let sTitle = (oBundle as ResourceBundle).getText("ACCEPTANCE_DIALOG_TITLE");
            that.getView().addDependent(oDialog);
            oDialog.setTitle(sTitle);
            oDialog.open();
        } else if (oSelected.aIndices && oSelected.aIndices.length === 1) {

            this.actionConfirmation(oSelected.aIndices, 0, "ACCEPT", "");
        }
    },

    actionConfirmation(aIndices: any[], iIndex: int, sAction: string, sReason: string): void {
        let oTempModel = this.getModel("tempModel") as JSONModel;
        var that = this as any;
        if (aIndices && aIndices.length > 1) {
            if (aIndices.length === iIndex) {
                oTempModel.setProperty("/enableClose", true);
                oTempModel.setProperty("/cancelled", true); //to disable cancel button
                oTempModel.setProperty("/actioned", 100);
                return;
            }
            let dCompleted = ((iIndex + 1) / aIndices.length) * 100;
            oTempModel.setProperty("/actioned", dCompleted);
            oTempModel.setProperty("/enableClose", false);
            if (oTempModel.getProperty("/cancelled")) {
                oTempModel.setProperty("/enableClose", true);
                return;
            }

        }
        let oObject = aIndices[iIndex].getObject();
        let oModel = that.getModel() as ODataModel;
        if (!oObject) {
            return;
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
        let oParameters = {
            "ConfirmationID": oObject.ConfirmationID,
            "PurchaseOrder": oObject.PurchaseOrder,
            "PurchaseOrderItem": oObject.PurchaseOrderItem,
            "Counter": oObject.Counter,
            "Action": sAction,
            "RejectionReason": sReason ? sReason : ""
        }
        oTempModel.setProperty("/actioning", oObject.PurchaseOrder + "/" + oObject.PurchaseOrderItem + ` (${iIndex + 1} of ${aIndices.length})`);
        that.getView().setBusy(true);
        
        oModel.callFunction(sRAPAction, {
            "urlParameters": oParameters,
            "method": "POST",
            success: function (oResp: any) {
                that.getView().setBusy(false);
                let aMessages = oTempModel.getProperty("/messages") || [];
                let oBundle = that.getModel("i18n").getResourceBundle();
                let sText = oBundle.getText("PROCESSED_SUCCESSFULLY", [oObject.PurchaseOrder + "/" + oObject.PurchaseOrderItem]);
                if (oResp && Array.isArray(oResp.results) && oResp.results.length > 0) {
                    oResp.results.forEach(function(oMsg:any){
                        aMessages.splice(0, 0, {
                            "purchaseOrder": oObject.PurchaseOrder + "/" + oObject.PurchaseOrderItem,
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
                        "purchaseOrder": oObject.PurchaseOrder + "/" + oObject.PurchaseOrderItem,
                        "type": "Success", "title": sText, "description": sText,
                        "icon": "sap-icon://message-success"
                    });
                }
                oTempModel.setProperty("/messages", aMessages);
                if (aIndices.length > 1) {
                    iIndex++;
                    that.actionConfirmation(aIndices, iIndex, sAction, sReason);
                } else {
                    that.showModelErrors(true);
                }
            }.bind(this),
            error: function () {
                if (aIndices.length <= 1) {
                    that.getView().setBusy(false);
                    that.showModelErrors(true);
                    return;
                }
                let aMessages = oTempModel.getProperty("/messages") || [];
                let aAll = that.getModelMessages();
                let aErrors = [];
                aErrors = that.cleanMessages(aAll);//This is to remove duplicate error/success messages
                for (var i = 0; i < aErrors.length; i++) {
                    aMessages.splice(0, 0, {
                        "purchaseOrder": oObject.PurchaseOrder + "/" + oObject.PurchaseOrderItem,
                        "type": aErrors[i].type, "title": aErrors[i].message, "description": aErrors[i].description,
                        "icon": "sap-icon://message-error"
                    });
                }
                oTempModel.setProperty("/messages", aMessages);
                iIndex++;
                that.actionConfirmation(aIndices, iIndex, sAction, sReason);
            }.bind(this)
        });
    },

    onVarianceReject(oEvent: Event): void {
        var that = this as any;
        var oSelected = this.getSelectedContexts(oEvent);
        if (!oSelected) { return; }
        let oTempModel = this.getModel("tempModel") as JSONModel;
        //Display dialog for rejection reasons
        oTempModel.setProperty("/rejectionReason", "");
        oTempModel.setProperty("/messages", []);
        let oDialog = sap.ui.xmlfragment(that.getView().getId(), "au.com.iesol.po.confirmation.variance.fragments.RejectionReasonsDialog", this) as Dialog;
        that.getView().addDependent(oDialog);
        oDialog.open();
    }
    , RejectVarianceContinue(oEvent: Event): void {
        var that = this as any;
        let oBundle = (this.getModel("i18n") as ResourceModel).getResourceBundle();
        let oTempModel = this.getModel("tempModel") as JSONModel;
        if (!oTempModel.getProperty("/rejectionReason") || oTempModel.getProperty("/rejectionReason").trim().length === 0) {
            let sText =(oBundle as ResourceBundle).getText("REJECTION_REASON_MANDATORY");
            MessageBox.error(sText, {
                title: (oBundle as ResourceBundle).getText("appTitle")
            });
            return;
        }
        //this.onDialogClose(oEvent);
        ((oEvent.getSource() as Control).getParent() as Dialog).close()
        var oSelected: any = this.getSelectedContexts(oEvent);
        if (!oSelected) { return; }

        if (oSelected.aIndices && oSelected.aIndices.length > 1) {
            //Call this migrate in foregroud with progress bar in a dialog
            let oDialog = sap.ui.xmlfragment(that.getView().getId(), "au.com.iesol.po.confirmation.variance.fragments.ActionDialog", this) as Dialog;
            oDialog.data("acceptance", { "indices": oSelected.aIndices, "action": "REJECT" });
            let sTitle = (oBundle as ResourceBundle).getText("REJECTION_DIALOG_TITLE");
            that.getView().addDependent(oDialog);
            oDialog.setTitle(sTitle);
            oDialog.open();
        } else if (oSelected.aIndices && oSelected.aIndices.length === 1) {

            this.actionConfirmation(oSelected.aIndices, 0, "REJECT", oTempModel.getProperty("/rejectionReason").trim());
        }

    },
    onDeletePurchaseOrderItem(oEvent: Event) {
        var that = this as any;
        var oSelected: any = this.getSelectedContexts(oEvent);
        if (!oSelected) { return; }
        (this.getModel("tempModel") as JSONModel).setProperty("/messages", []);
        if (oSelected.aIndices && oSelected.aIndices.length > 1) {
            //Call this migrate in foregroud with progress bar in a dialog
            let oBundle = (this.getModel("i18n") as ResourceModel).getResourceBundle();
            let oDialog = sap.ui.xmlfragment(that.getView().getId(), "au.com.iesol.po.confirmation.variance.fragments.ActionDialog", this) as Dialog;
            oDialog.data("acceptance", { "indices": oSelected.aIndices, "action": "DELPOITEM" });
            let sTitle = (oBundle as ResourceBundle).getText("REJECTION_DIALOG_TITLE");
            that.getView().addDependent(oDialog);
            oDialog.setTitle(sTitle);
            oDialog.open();
        } else if (oSelected.aIndices && oSelected.aIndices.length === 1) {

            this.actionConfirmation(oSelected.aIndices, 0, "DELPOITEM", "");
        }
    },
    onResolved(oEvent: Event) {
        var that = this as any;
        var oSelected: any = this.getSelectedContexts(oEvent);
        let oBundle = (this.getModel("i18n") as ResourceModel).getResourceBundle();
        if (!oSelected) { return; }
        (this.getModel("tempModel") as JSONModel).setProperty("/messages", []);
        if (oSelected.aIndices && oSelected.aIndices.length > 1) {
            //Call this migrate in foregroud with progress bar in a dialog
            let oDialog = sap.ui.xmlfragment(that.getView().getId(), "au.com.iesol.po.confirmation.variance.fragments.ActionDialog", this) as Dialog;
            oDialog.data("acceptance", { "indices": oSelected.aIndices, "action": "RESOLVED" });
            let sTitle = (oBundle as ResourceBundle).getText("REJECTION_DIALOG_TITLE");
            that.getView().addDependent(oDialog);
            oDialog.setTitle(sTitle);
            oDialog.open();
        } else if (oSelected.aIndices && oSelected.aIndices.length === 1) {

            this.actionConfirmation(oSelected.aIndices, 0, "RESOLVED", "");
        }
    },
    adjustColumnWidths(oEvent: Event) {
        let oTable = oEvent.getSource() as Table;

        let aColumns = oTable.getColumns();
        var bBusy = oEvent.getParameter("busy");
        if (!bBusy) {

            // var oTpc = null;
            // if (TablePointerExtension) {
            // 	oTpc = new TablePointerExtension(oTable);
            // // } else {
            // 	oTpc = new sap.ui.table.extensions.Pointer(oTable);
            // }
            for (var i = 0; i < aColumns.length; i++) {
                oTable.autoResizeColumn(i);
            }
        }
        aColumns[0].focus();
    },
    getTableId(): string {
        return 'au.com.iesol.po.confirmation.variance::sap.suite.ui.generic.template.ListReport.view.ListReport::xIESOLxC_SUPL_CONFIRMATION--listReport';
    }
    //------------------------------------------------------------------------------------------------//
    , getModel(sName:string): Model {
        //Shortcut for get model
        var that = this as any;
        return that.getView().getModel(sName);
    }
    , MessageViewNavBack(): void {
        var that = this as any;
        that.byId("idErrorMessageViewInDialog").navigateBack();
        (this.getModel("tempModel") as JSONModel).setProperty("/navigateBack", false);
    }
    , onMessageViewItemSelect() {
        (this.getModel("tempModel") as JSONModel).setProperty("/navigateBack", true);
    }
    , getModelMessages(): any[] {
        let oMsgModel = sap.ui.getCore().getMessageManager().getMessageModel();
        //let oTempModel = this.getModel("tempModel");
        let aAll = oMsgModel.getData();
        return aAll;
    }

    , showModelErrors(bCleaned: boolean) {
        
        //let oMsgModel = sap.ui.getCore().getMessageManager().getMessageModel();
        let oTempModel = this.getModel("tempModel") as JSONModel;
        if (!bCleaned) {
            let aAll = this.getModelMessages();
            let aErrors = [];
            aErrors = this.cleanMessages(aAll);//This is to remove duplicate error/success messages
            let aMessages: any[] = [];
            aErrors.forEach(oE => {
                aMessages.push({ type: oE.type, title: oE.message, description: oE.description });
            });
            oTempModel.setProperty("/messages", aMessages);
        }
        oTempModel.setProperty("/navigateBack", false);
        var oDialog = sap.ui.xmlfragment((this as any).getView().getId(), "au.com.iesol.po.confirmation.variance.fragments.ErrorMessages", this) as Dialog;
        (this as any).getView().addDependent(oDialog);
        oDialog.open();
    }
    , cleanMessages(aMessages: any[]): any[] {
        let aErrors = [];
        for (var i = 0; i < aMessages.length; i++) {
            let aE = aErrors.filter(function (oE) {
                return oE.message === aMessages[i].message ||
                    oE.message === aMessages[i].message + ".";
            });
            // let aE = jQuery.grep(aErrors, function (oE) {
            //     return oE.message === aMessages[i].message ||
            //         oE.message === aMessages[i].message + ".";
            // });
            if (aE.length > 0) {
                continue;
            }
            aErrors.push(aMessages[i]);
        }
        return aErrors;
    }
    , onDialogClose: function (oEvent: Event, oDialogIn: Dialog) {

        let oDialog = oEvent ? (oEvent.getSource() as Dialog) : oDialogIn;

        oDialog.close();
        try {
            let oPage = oDialog.getContent()[0] as Page;
            if (oPage instanceof DynamicPage) {
                //oPage.destroyHeader();
                oPage.destroyContent();
                oPage.destroyFooter();
                oPage.destroy();
            }
        } catch (e) { }
        oDialog.destroyContent();
        oDialog.destroy();
    }
}