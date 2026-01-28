import sys
import json
import tomlkit
import tomlkit.items
from pathlib import Path


def toml_to_dict(item):


    if isinstance(item, tomlkit.items.AoT):
        return [toml_to_dict(v) for v in item]
        

    if isinstance(item, (tomlkit.items.Table, tomlkit.items.InlineTable, dict)):
        return {k: toml_to_dict(v) for k, v in item.items()}
        

    if isinstance(item, list):
        return [toml_to_dict(v) for v in item]
        

    return item

def dict_to_toml(data):

    if isinstance(data, dict):
        tbl = tomlkit.table()
        for k, v in data.items():

            tbl.add(k, dict_to_toml(v))
        return tbl
    

    if isinstance(data, list):

        if len(data) > 0 and all(isinstance(i, dict) for i in data):

            aot = tomlkit.aot()
            for item_dict in data:
                aot.append(dict_to_toml(item_dict))
            return aot
        else:

            return [dict_to_toml(v) for v in data]
            

    return data

def load_patches(file_path):
    try:
        p = Path(file_path)
        if not p.exists():
            print(json.dumps({"success": False, "error": "File not found"}))
            return
        raw_content = p.read_text(encoding='utf-8')
        data = tomlkit.parse(raw_content)
        patch_list = []
        if "patch" in data and isinstance(data["patch"], tomlkit.items.AoT):
            for i, patch_item in enumerate(data["patch"]):
                patch_data = toml_to_dict(patch_item) 
                patch_data["id"] = f"complex_patch_{i}"
                patch_list.append(patch_data)
        else:
            simple_patches = []
            for key, value in data.items():
                if key.startswith("patch_") and isinstance(value, tomlkit.items.Table):
                    patch_data = toml_to_dict(value)
                    patch_data["id"] = key
                    simple_patches.append(patch_data)
            if len(simple_patches) > 0:
                patch_list = simple_patches
        raw_header = {k: v for k, v in data.items() if k != "patch" and not k.startswith("patch_")}
        header = toml_to_dict(raw_header)
        print(json.dumps({"success": True, "patches": patch_list, "header": header}))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Load Patches Error: {str(e)}"}))

def save_patches(file_path, patches_json, header_json):
    try:
        p = Path(file_path)
        raw_content = p.read_text(encoding='utf-8')
        doc = tomlkit.parse(raw_content)
        patch_list = json.loads(patches_json)
        header = json.loads(header_json)
        if "patch" in doc:
            del doc["patch"]
        keys_to_delete = [k for k in doc.keys() if k.startswith("patch_")]
        for k in keys_to_delete:
            del doc[k]
        for key, value in header.items():
            doc[key] = value
        if len(patch_list) == 0:
            pass
        elif patch_list[0]["id"].startswith("complex_patch_"):
            aot = tomlkit.aot() 
            for p_dict in patch_list:
                del p_dict["id"]
                toml_table = dict_to_toml(p_dict)
                aot.append(toml_table)
            doc.add("patch", aot)
        else:
            for p_dict in patch_list:
                patch_key = p_dict["id"]
                del p_dict["id"]
                toml_table = dict_to_toml(p_dict)
                doc.add(patch_key, toml_table)
        p.write_text(tomlkit.dumps(doc), encoding='utf-8')
        print(json.dumps({"success": True}))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Save Patches Error: {str(e)}"}))



def load_config(file_path):

    try:
        p = Path(file_path)
        if not p.exists():
            print(json.dumps({"success": False, "error": "Config file not found"}))
            return
        
        raw_content = p.read_text(encoding='utf-8')
        data = tomlkit.parse(raw_content)
        config_dict = toml_to_dict(data)
        print(json.dumps({"success": True, "data": config_dict}))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Load Config Error: {str(e)}"}))

def save_config(file_path, config_json):

    try:
        p = Path(file_path)
        if not p.exists():
            print(json.dumps({"success": False, "error": "Config file not found"}))
            return


        raw_content = p.read_text(encoding='utf-8')
        doc = tomlkit.parse(raw_content)
        

        new_data = json.loads(config_json)
        

        for category_key, options_dict in new_data.items():
            if category_key in doc and isinstance(doc[category_key], tomlkit.items.Table):
                for option_key, option_value in options_dict.items():
                    if option_key in doc[category_key]:

                        doc[category_key][option_key] = option_value
        

        p.write_text(tomlkit.dumps(doc), encoding='utf-8')
        print(json.dumps({"success": True}))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Save Config Error: {str(e)}"}))


if __name__ == "__main__":
    command = sys.argv[1]
    file_path = sys.argv[2]

    if command == "load_patches":
        load_patches(file_path)
        
    elif command == "save_patches":
        patches_data = sys.argv[3]
        header_data = sys.argv[4]
        save_patches(file_path, patches_data, header_data)
        
    elif command == "load_config":
        load_config(file_path)
        
    elif command == "save_config":
        config_data = sys.argv[3]
        save_config(file_path, config_data)
        
    else:
        print(json.dumps({"success": False, "error": "Unknown command"}))
